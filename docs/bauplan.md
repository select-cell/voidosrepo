# Bauplan: Voidos Sales-CRM

## 1. Ziel & Scope

Internes Sales-CRM zur Erfassung und Bearbeitung von Leads nach Eintragung. Kernstück ist ein Kanban-Board für Deals (Pipedrive/Close-Stil) hinter einem passwortgeschützten Bereich.

**MVP-Scope (Phase 1):**
- Login (Supabase Auth)
- Kanban-Pipeline für Deals mit frei konfigurierbaren Stages
- Kontakte-Verwaltung
- Aktivitäten-Timeline pro Deal/Kontakt
- Tasks mit Fälligkeitsdatum
- Custom Fields
- Lead-Intake-Endpoint (automatisches Anlegen von Leads nach Eintragung)
- Duplikat-Check beim Intake

**Explizit NICHT im MVP:**
- E-Mail-Integration/Versand
- Reporting/Dashboards (Phase 2)
- Mehrere Pipelines gleichzeitig (Schema ist darauf vorbereitet, UI erstmal nur 1 Pipeline)

---

## 2. Wichtige Rahmenbedingung: Kein separater Server

Supabase Auth wird **direkt vom Frontend aus** über `@supabase/supabase-js` angesprochen (Login, Session, Token-Refresh). Es ist kein eigener Auth-Server oder Backend-Service nötig, den ihr selbst hosten/warten müsstet. Die einzige "serverseitige" Logik (Lead-Intake, siehe Abschnitt 4) läuft als Edge Function **innerhalb** von Supabase – also ebenfalls kein separates Hosting.

**Faktisches Setup bleibt also:** Supabase-Projekt + React-Code + Netlify-Hosting. Kein zusätzlicher Server.

Da im MVP erstmal **ein einzelner Zugang** reicht (kein Rollen-/Rechte-Management für ein Team nötig), wurde die Rollen-Logik entsprechend vereinfacht (siehe Abschnitt 3 & 9).

---

## 3. Architektur-Überblick

```
┌─────────────────────────────┐
│   React + Vite + TS (SPA)   │
│   gehostet auf Netlify      │
└──────────────┬───────────────┘
               │ supabase-js (REST/Realtime)
               ▼
┌─────────────────────────────┐
│         Supabase            │
│  - Postgres DB               │
│  - Auth                      │
│  - Row Level Security        │
│  - Edge Function (Lead-Intake)│
└─────────────────────────────┘
               ▲
               │ POST (Service Role via Edge Function)
   Externes Anmelde-/Eintragungsformular
```

Repo liegt auf GitHub (Claude Code angebunden), CI/CD via Netlify (Auto-Deploy bei Push auf `main`).

---

## 4. Supabase: Datenbank-Schema

> Hinweis: Auf eine `profiles`-Tabelle mit Rollen-Management wird im MVP verzichtet, da erstmal nur ein einzelner Zugang benötigt wird. `owner_id`/`assigned_to`/`created_by` referenzieren daher direkt `auth.users(id)`. Eine `profiles`-Tabelle mit Rollen lässt sich jederzeit später nachrüsten, sobald mehrere Personen Zugriff brauchen.

```sql
-- ============================================
-- PIPELINES
-- ============================================
create table pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- STAGES (Spalten im Kanban-Board)
-- ============================================
create table stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  position integer not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_stages_pipeline on stages(pipeline_id);

-- ============================================
-- CONTACTS
-- ============================================
create table contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company text,
  source text,                     -- z.B. "Signup Formular", "Referral"
  custom_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_contacts_email on contacts(lower(email)) where email is not null;

-- ============================================
-- DEALS
-- ============================================
create table deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id),
  stage_id uuid not null references stages(id),
  title text not null,
  value numeric(12,2),
  currency text default 'EUR',
  owner_id uuid references auth.users(id),
  custom_fields jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);
create index idx_deals_stage on deals(stage_id);
create index idx_deals_contact on deals(contact_id);

-- ============================================
-- ACTIVITIES (Timeline)
-- ============================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  type text not null check (type in ('note','call','stage_change','system')),
  content text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_activities_deal on activities(deal_id);
create index idx_activities_contact on activities(contact_id);

-- ============================================
-- TASKS
-- ============================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  is_done boolean not null default false,
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_tasks_deal on tasks(deal_id);
create index idx_tasks_due on tasks(due_at) where is_done = false;

-- ============================================
-- Trigger: updated_at automatisch pflegen
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_contacts_updated before update on contacts
  for each row execute function set_updated_at();
create trigger trg_deals_updated before update on deals
  for each row execute function set_updated_at();

-- ============================================
-- Trigger: Stage-Wechsel automatisch als Activity loggen
-- ============================================
create or replace function log_stage_change()
returns trigger as $$
begin
  if old.stage_id is distinct from new.stage_id then
    new.stage_changed_at = now();
    insert into activities (deal_id, type, content, created_by)
    values (new.id, 'stage_change', 'Stage geändert', auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_deal_stage_change before update on deals
  for each row execute function log_stage_change();
```

### Row Level Security (RLS)

```sql
alter table pipelines enable row level security;
alter table stages enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;

-- Grundregel MVP: jeder eingeloggte User sieht alles (kleines Team).
-- Bei Bedarf später auf owner_id-Filterung für 'sales'-Rolle umstellen.

create policy "Authenticated full access pipelines" on pipelines
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access stages" on stages
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access contacts" on contacts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access deals" on deals
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access activities" on activities
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access tasks" on tasks
  for all using (auth.role() = 'authenticated');
```

### Seed-Daten (Default-Pipeline & Stages)

```sql
insert into pipelines (name, is_default) values ('Vertrieb', true);

insert into stages (pipeline_id, name, position, is_won, is_lost)
select id, stage_name, pos, won, lost from pipelines,
  (values
    ('Neu', 1, false, false),
    ('Kontaktiert', 2, false, false),
    ('Qualifiziert', 3, false, false),
    ('Angebot', 4, false, false),
    ('Gewonnen', 5, true, false),
    ('Verloren', 6, false, true)
  ) as s(stage_name, pos, won, lost)
where pipelines.is_default = true;
```

---

## 5. Lead-Intake (automatisches Anlegen nach Eintragung)

**Ansatz:** Supabase Edge Function als Webhook-Endpoint, aufgerufen vom Signup-System.

```
POST /functions/v1/lead-intake
Body: { "full_name": "...", "email": "...", "company": "...", "source": "signup" }
```

Logik in der Edge Function:
1. Prüfen, ob `contacts` mit dieser E-Mail bereits existiert (Duplikat-Check) → wenn ja, keinen neuen Contact anlegen, ggf. nur Activity "Erneute Eintragung" hinzufügen.
2. Falls neu: Contact anlegen.
3. Deal in Default-Pipeline, Stage "Neu" anlegen, verknüpft mit dem Contact.
4. Activity vom Typ `system` mit "Lead über Signup eingetragen" anlegen.

Die Edge Function nutzt den **Service Role Key** (nicht den anon key), da sie außerhalb eines eingeloggten User-Kontexts läuft und RLS umgehen muss.

---

## 6. Frontend-Struktur (React + Vite + TS)

```
src/
├── lib/
│   ├── supabase.ts          # Client-Init
│   └── database.types.ts    # generiert via `supabase gen types typescript`
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── useAuth.ts
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx
│   │   ├── StageColumn.tsx
│   │   └── DealCard.tsx
│   ├── deals/
│   │   ├── DealDetailPanel.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── TaskList.tsx
│   └── contacts/
│       ├── ContactsList.tsx
│       └── ContactDetailPanel.tsx
├── components/               # generische UI (Button, Modal, Input...)
├── hooks/
│   └── useDeals.ts           # TanStack Query hooks
├── routes/
│   └── AppRouter.tsx
├── App.tsx
└── main.tsx
```

**Kern-Pakete:**
| Paket | Zweck |
|---|---|
| `@supabase/supabase-js` | DB/Auth-Client |
| `@tanstack/react-query` | Datenfetching, Caching, optimistic updates |
| `@dnd-kit/core` | Drag & Drop im Kanban-Board |
| `tailwindcss` | Styling |
| `zustand` | leichter UI-State (z.B. offenes Deal-Panel) |
| `react-router-dom` | Routing |

**Kanban-Drag-Verhalten:** Beim Verschieben eines Deals per Drag & Drop wird `stage_id` per optimistic update sofort im UI geändert, dann per `supabase.from('deals').update(...)` persistiert. Der Trigger `log_stage_change` übernimmt automatisch das Activity-Logging serverseitig.

---

## 7. Environment-Variablen

**Im Frontend (React/Vite) wird ausschließlich der `anon`-Key verwendet:**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Der **Service Role Key** wird **niemals** im Frontend-Code, Bundle oder Netlify-Frontend-Env eingesetzt – er gehört ausschließlich als Secret in die Supabase Edge Function (Abschnitt 5), da er alle RLS-Policies umgeht und vollen DB-Zugriff hat.

Sicherheit entsteht hier nicht durch Geheimhaltung des anon-Keys (der landet zwangsläufig im Browser-Bundle), sondern durch die Kombination aus anon-Key + RLS-Policy (`auth.role() = 'authenticated'`) + Login-Pflicht: Ohne gültige Session bleibt jede Anfrage im Status `anon` und wird von der Policy blockiert.

---

## 8. Deployment

- **Repo:** GitHub, Branch `main` = Produktionsstand
- **Netlify:**
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Auto-Deploy bei Push auf `main`
  - Env-Vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) im Netlify-Dashboard hinterlegen
- **Supabase-Migrationen:** als SQL-Dateien im Repo unter `supabase/migrations/` versionieren, damit Claude Code sie nachvollziehbar anwenden kann (`supabase db push` oder manuell im SQL-Editor)

---

## 9. Offene Entscheidungen für Claude Code / euch

- [ ] Soll das Lead-Formular direkt an die Edge Function posten, oder gibt es schon ein System, das den Webhook aufruft?
- [ ] Soll "Verloren"-Grund als Pflichtfeld beim Verschieben in die Lost-Stage erfasst werden?
- [ ] Sobald mehr als eine Person Zugriff braucht: `profiles`-Tabelle mit Rollen (siehe Abschnitt 4) nachrüsten und RLS entsprechend verschärfen (aktuell sieht jeder eingeloggte User alles).
