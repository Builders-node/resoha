-- Дім (секція, корпус) усередині ЖК: ЖК → доми → квартири.
-- У кожного дому свої поверхи, стадія будівництва, термін здачі, адреса й фото.
create table if not exists public.buildings (
  id             uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments(id) on delete cascade,
  name           text not null check (length(name) between 1 and 60),
  photo          text not null default '',
  floors         int check (floors between 1 and 200),
  stage          text not null default 'construction'
    check (stage in ('planned', 'prep', 'construction', 'built', 'delivered')),
  completion     text not null default '' check (length(completion) <= 40),
  address        text not null default '' check (length(address) <= 120),
  sort           int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists buildings_development_idx on public.buildings (development_id, sort);

alter table public.buildings enable row level security;

-- бачить той, хто бачить сам ЖК (RLS developments діє і в підзапиті)
create policy buildings_read on public.buildings for select using (
  exists (select 1 from public.developments d where d.id = buildings.development_id)
);
-- змінює той, хто керує ЖК: автор, власник агенції або адмін
create policy buildings_write on public.buildings for all to authenticated
  using (exists (select 1 from public.developments d where d.id = buildings.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = buildings.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())));

grant select on public.buildings to anon, authenticated;
grant insert, update, delete on public.buildings to authenticated;

-- Квартира знає свій дім
alter table public.listings
  add column building_id uuid references public.buildings(id) on delete set null;
create index if not exists listings_building_idx on public.listings (building_id);
grant select (building_id) on public.listings to anon, authenticated;
grant insert (building_id), update (building_id) on public.listings to authenticated;

-- Уже наявні ЖК з квартирами отримують один дім, і всі їхні квартири переходять у нього
with made as (
  insert into public.buildings (development_id, name, floors, completion, address, photo, stage)
  select d.id, d.name, d.floors, d.completion, d.address, coalesce(d.photos[1], ''), 'construction'
  from public.developments d
  where exists (select 1 from public.listings l where l.development_id = d.id)
    and not exists (select 1 from public.buildings b where b.development_id = d.id)
  returning id, development_id
)
update public.listings l set building_id = made.id
from made where l.development_id = made.development_id and l.building_id is null;
