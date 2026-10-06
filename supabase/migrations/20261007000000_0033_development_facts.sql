-- Сторінка ЖК: характеристики будинку, умови для інвестора й оплата.
-- Колонки на всю таблицю developments — гранти на таблицю вже покривають їх.
alter table public.developments
  add column floors       int check (floors between 1 and 200),
  add column construction text not null default '' check (length(construction) <= 120),
  add column parking      text not null default '' check (length(parking) <= 120),
  add column amenities    text[] not null default '{}',
  add column hoa          int check (hoa between 0 and 100000),
  add column rentals      text not null default '' check (rentals in ('', 'short', 'long', 'none')),
  add column payment      text not null default '' check (length(payment) <= 2000);
