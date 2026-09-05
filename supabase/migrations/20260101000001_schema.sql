-- ============================================
-- Voidos Sales-CRM - Basisschema
-- Siehe Bauplan Abschnitt 4. Auf eine `profiles`-Tabelle mit
-- Rollen-Management wird im MVP verzichtet (ein einzelner Zugang reicht).
-- owner_id / assigned_to / created_by referenzieren daher direkt auth.users(id).
-- ============================================

-- ============================================
-- PIPELINES
-- ============================================
create table pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Es darf immer nur maximal eine Default-Pipeline geben.
create unique index idx_pipelines_single_default
  on pipelines (is_default)
  where is_default;

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
  -- Pflichtfeld sobald ein Deal in eine "Verloren"-Stage verschoben wird,
  -- siehe Trigger handle_deal_stage_change() in der nächsten Migration.
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);
create index idx_deals_stage on deals(stage_id);
create index idx_deals_contact on deals(contact_id);
create index idx_deals_pipeline on deals(pipeline_id);

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
