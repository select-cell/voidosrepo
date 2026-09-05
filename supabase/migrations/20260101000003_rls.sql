-- ============================================
-- Row Level Security (RLS)
--
-- Grundregel MVP: jeder eingeloggte User sieht alles (ein einzelner
-- Zugang reicht aktuell, siehe Bauplan Abschnitt 2/9). Sobald mehr als
-- eine Person Zugriff braucht: profiles-Tabelle mit Rollen nachrüsten
-- und diese Policies auf owner_id-Filterung umstellen.
--
-- `to authenticated` statt eines `auth.role() = 'authenticated'`-Filters
-- in der USING-Klausel: Postgres kann die Rollenzuordnung dadurch beim
-- Query-Planning einmal auflösen statt bei jeder Zeile neu (empfohlenes
-- Supabase-Performance-Pattern), Effekt ist identisch.
-- ============================================
alter table pipelines enable row level security;
alter table stages enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;

create policy "Authenticated full access pipelines" on pipelines
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access stages" on stages
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access contacts" on contacts
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access deals" on deals
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access activities" on activities
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access tasks" on tasks
  for all to authenticated using (true) with check (true);

-- Hinweis: Die Lead-Intake Edge Function (siehe supabase/functions/lead-intake)
-- läuft mit dem service_role Key und umgeht RLS bewusst, da sie außerhalb
-- eines eingeloggten User-Kontexts (anonymes Signup-Formular / externes
-- System) neue Contacts/Deals anlegen muss.
