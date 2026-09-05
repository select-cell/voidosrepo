# Voidos Sales-CRM

Internes Sales-CRM mit Kanban-Pipeline für Deals, Kontaktverwaltung,
Aktivitäten-Timeline, Tasks und automatischem Lead-Intake nach Eintragung.

MVP-Umsetzung des `voidoscrmbauplan.md`-Bauplans: React + Vite + TypeScript
(SPA) gegen Supabase (Postgres, Auth, Row Level Security, Edge Functions),
gehostet auf Netlify. Kein separater Server nötig.

## Tech-Stack

| Bereich | Wahl |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Daten/Auth | Supabase (`@supabase/supabase-js`) |
| Server-State | TanStack Query (Caching, optimistic updates) |
| UI-State | Zustand |
| Drag & Drop | `@dnd-kit` |
| Routing | React Router |
| Hosting | Netlify (Auto-Deploy bei Push auf `main`) |

## Voraussetzungen

- Node.js 20+
- Ein Supabase-Projekt (kostenloser Tier reicht für den Start)
- [Supabase CLI](https://supabase.com/docs/guides/cli) für Migrationen & Edge-Function-Deploy
- Ein Netlify-Account für's Hosting

## 1. Supabase-Projekt einrichten

1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Projekt lokal verknüpfen:
   ```bash
   supabase login
   supabase link --project-ref <dein-projekt-ref>
   ```
3. Migrationen ausrollen (Schema, RLS, Seed-Daten, Trigger):
   ```bash
   supabase db push
   ```
   Alternativ: die Dateien unter `supabase/migrations/` der Reihe nach im
   SQL-Editor des Supabase-Dashboards ausführen.
4. **Ersten (und einzigen) Nutzer-Zugang anlegen:** Dashboard → Authentication
   → Users → "Add user" (E-Mail + Passwort). Ein Rollen-/Rechte-System ist im
   MVP bewusst nicht vorgesehen (siehe Bauplan Abschnitt 2/9) – ein einzelner
   Zugang reicht aktuell.
5. TypeScript-Typen können nach dem ersten Deploy aus dem echten Schema
   generiert werden (ersetzt die handschriftlichen Typen in
   `src/lib/database.types.ts` 1:1):
   ```bash
   supabase gen types typescript --project-id <dein-projekt-ref> > src/lib/database.types.ts
   ```

## 2. Lead-Intake Edge Function deployen

```bash
supabase functions deploy lead-intake --no-verify-jwt
```

Die Function braucht kein manuelles Secret-Setzen für `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` – die injiziert Supabase automatisch. Optional
(empfohlen für den Aufruf durch ein externes Anmeldesystem) ein Shared
Secret setzen:

```bash
supabase secrets set LEAD_INTAKE_SHARED_SECRET=<ein-langer-zufallsstring>
```

Das externe System schickt dieses Secret dann im Header `x-webhook-secret`
mit. Ohne das Secret funktioniert der Endpoint weiterhin (Fallback für das
öffentliche `/signup`-Formular im Frontend, siehe Abschnitt "Sicherheit"
unten) – ist es aber gesetzt und der Header falsch, wird die Anfrage mit
`401` abgelehnt.

## 3. Frontend lokal starten

```bash
npm install
cp .env.example .env
# .env mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (Dashboard -> Settings -> API) befüllen
npm run dev
```

Weitere Scripts: `npm run build` (Production-Build), `npm run typecheck`,
`npm run lint`.

## 4. Netlify-Deployment

1. Repo mit Netlify verbinden (Build command `npm run build`, Publish
   directory `dist` – bereits in `netlify.toml` hinterlegt).
2. Env-Vars im Netlify-Dashboard setzen: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (**nur der anon-Key, niemals der service_role
   Key**).
3. Push auf `main` löst automatisch ein Deploy aus.

## Features (MVP-Scope)

- **Login** (Supabase Auth, E-Mail/Passwort) hinter `/pipeline`, `/contacts`
- **Kanban-Pipeline**: Drag & Drop zwischen frei konfigurierbaren Stages,
  optimistic UI-Update, serverseitiges Activity-Logging per DB-Trigger
- **Pflicht-Verlustgrund**: Beim Verschieben in eine "Verloren"-Stage öffnet
  sich ein Dialog, der einen Grund verlangt – zusätzlich auf DB-Ebene per
  Trigger erzwungen (siehe "Abweichungen vom Bauplan" unten)
- **Kontakte-Verwaltung**: Liste mit Suche, Detailseite mit verknüpften
  Deals, Aktivitäten und Custom Fields
- **Aktivitäten-Timeline** pro Deal/Kontakt (Notizen, automatische
  System-Einträge bei Stage-Wechsel/Lead-Intake)
- **Tasks** mit Fälligkeitsdatum pro Deal
- **Custom Fields** (generischer Key/Value-Editor, für Deals und Kontakte)
- **Lead-Intake**, auf drei Wegen (Entscheidung siehe Bauplan Abschnitt 9):
  1. `POST /functions/v1/lead-intake` – für ein externes Anmelde-/Signup-System
  2. `/signup` – öffentliches, unauthenticated Formular im Frontend als
     Fallback (postet an denselben Endpoint)
  3. "+ Neuer Lead" Button direkt im Kanban-Board – manuelle Nutzung durch
     die eingeloggte Person, z.B. wenn ein Lead telefonisch reinkommt
  4. Duplikat-Check über die E-Mail in allen drei Wegen

## Abweichungen / Ergänzungen gegenüber dem ursprünglichen Bauplan

Der Bauplan war bereits sehr detailliert; folgende Punkte wurden beim
Umsetzen präzisiert oder ergänzt:

- **`lost_reason`-Pflichtfeld** (Bauplan-Entscheidung, Abschnitt 9): Spalte
  `deals.lost_reason` ergänzt. Wird sowohl im UI-Dialog als auch per
  DB-Trigger (`handle_deal_stage_change`) erzwungen, sobald ein Deal in eine
  `is_lost`-Stage wechselt – und automatisch zurückgesetzt, wenn der Deal die
  Stage wieder verlässt.
- **`deals.status`-Sync automatisiert**: derselbe Trigger setzt `status`
  passend zur Ziel-Stage (`open`/`won`/`lost`), damit UI und späteres
  Reporting sich nicht selbst darum kümmern müssen.
- **Sicherheit des Lead-Intake-Endpoints**: Die Edge Function ist eine
  öffentlich erreichbare URL. Ergänzt wurden ein optionaler
  Shared-Secret-Header (`x-webhook-secret`) für vertrauenswürdige Aufrufer
  und ein Honeypot-Feld (`website`) für den öffentlichen Formular-Pfad, der
  kein Secret geheim halten kann. Kein Rate-Limiting eingebaut (Edge
  Functions sind zustandslos – dafür bräuchte es eine eigene Tabelle +
  Cleanup-Logik); falls der öffentliche `/signup`-Pfad missbraucht wird,
  einfach entfernen oder um Turnstile/hCaptcha ergänzen.
- **Eindeutige Default-Pipeline**: partieller Unique-Index auf
  `pipelines.is_default`, damit nicht versehentlich zwei Default-Pipelines
  entstehen.
- **RLS-Policies** nutzen `to authenticated` statt `auth.role() =
  'authenticated'` in der USING-Klausel (Supabase-Performance-Empfehlung,
  identisches Ergebnis).
- **Manueller Lead-Weg innerhalb des CRM** ("+ Neuer Lead" im Kanban-Board)
  ergänzt, damit ein Lead nicht zwingend über Webhook oder öffentliches
  Formular reinkommen muss.

## Was ich nicht selbst ausführen konnte

Diese Session hat nur GitHub-Zugriff auf dieses Repo – kein Supabase- oder
Netlify-Zugang. Das heißt: Supabase-Projekt anlegen, Migrationen gegen eine
laufende DB ausführen, Edge Function deployen, Secrets setzen und die
Netlify-Site verknüpfen müssen einmalig manuell erledigt werden (Schritte 1–4
oben).

## Explizit nicht im MVP (siehe Bauplan Abschnitt 1)

- E-Mail-Integration/Versand
- Reporting/Dashboards
- Mehrere Pipelines gleichzeitig in der UI (Schema unterstützt es bereits)
- Rollen-/Rechte-Management (aktuell: ein einzelner Zugang, jeder
  eingeloggte User sieht alles – `profiles`-Tabelle mit Rollen ist im
  Bauplan als Phase-2-Erweiterung vorgesehen)

## Projektstruktur

```
src/
├── lib/            # Supabase-Client, DB-Typen
├── features/
│   ├── auth/       # Login, Session, ProtectedRoute-Kontext
│   ├── pipeline/   # Kanban-Board, Drag&Drop, Lost-Reason/New-Deal-Dialoge
│   ├── deals/       # Deal-Detail-Panel, Activity-Timeline, Tasks, Custom Fields
│   ├── contacts/   # Kontakte-Liste, Kontakt-Detail
│   └── leads/      # Öffentliches Signup-Formular
├── components/     # Generische UI (Button, Modal, Input, AppShell, ...)
├── hooks/          # TanStack-Query-Hooks pro Domäne
├── store/          # Zustand (UI-State)
└── routes/         # Router + ProtectedRoute

supabase/
├── migrations/     # Versioniertes SQL-Schema (Reihenfolge = Dateiname)
└── functions/
    └── lead-intake/  # Edge Function für Lead-Intake
```
