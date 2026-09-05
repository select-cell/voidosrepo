-- ============================================
-- Seed-Daten: Default-Pipeline & Stages
-- ============================================
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
