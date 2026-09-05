-- ============================================
-- Trigger: Stage-Wechsel validieren, status synchronisieren,
-- automatisch als Activity loggen.
--
-- Erweiterung gegenüber dem ursprünglichen Bauplan (Abschnitt 4/9):
-- Beim Verschieben eines Deals in eine "Verloren"-Stage ist lost_reason
-- Pflicht (Entscheidung aus Abschnitt 9). Das wird hier auf DB-Ebene
-- erzwungen (defense in depth), zusätzlich zur UI-Validierung.
-- deals.status wird passend zur Ziel-Stage (is_won/is_lost) automatisch
-- gesetzt, damit UI und Reporting sich nicht selbst darum kümmern müssen.
-- ============================================
create or replace function handle_deal_stage_change()
returns trigger as $$
declare
  v_is_won boolean;
  v_is_lost boolean;
  v_stage_changed boolean;
begin
  select is_won, is_lost into v_is_won, v_is_lost
  from stages where id = new.stage_id;

  if not found then
    raise exception 'Unbekannte stage_id: %', new.stage_id;
  end if;

  v_stage_changed := (tg_op = 'INSERT') or (old.stage_id is distinct from new.stage_id);

  if v_is_lost and (new.lost_reason is null or btrim(new.lost_reason) = '') then
    raise exception 'lost_reason ist Pflicht, wenn ein Deal in eine "Verloren"-Stage verschoben wird';
  end if;

  -- Grund zurücksetzen, sobald ein Deal die Lost-Stage wieder verlässt
  if not v_is_lost then
    new.lost_reason := null;
  end if;

  new.status := case
    when v_is_won then 'won'
    when v_is_lost then 'lost'
    else 'open'
  end;

  if v_stage_changed then
    new.stage_changed_at := now();
    if tg_op = 'UPDATE' then
      insert into activities (deal_id, type, content, created_by)
      values (new.id, 'stage_change', 'Stage geändert', auth.uid());
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_deal_stage_change
  before insert or update on deals
  for each row execute function handle_deal_stage_change();
