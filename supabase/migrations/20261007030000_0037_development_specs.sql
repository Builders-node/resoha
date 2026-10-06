-- «Характеристики проєкту» як у LUN: клас, стіни, утеплення, клімат, стелі,
-- оздоблення, територія, резервне живлення, вода. Вільний текст, порожнє — не показуємо.
alter table public.developments
  add column project_class text not null default '' check (length(project_class) <= 60),
  add column walls         text not null default '' check (length(walls) <= 120),
  add column insulation    text not null default '' check (length(insulation) <= 120),
  add column climate       text not null default '' check (length(climate) <= 120),
  add column ceiling       text not null default '' check (length(ceiling) <= 60),
  add column finish        text not null default '' check (length(finish) <= 120),
  add column territory     text not null default '' check (length(territory) <= 120),
  add column backup_power  text not null default '' check (length(backup_power) <= 120),
  add column water         text not null default '' check (length(water) <= 120);
