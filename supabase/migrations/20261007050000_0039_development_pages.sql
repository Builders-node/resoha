-- Окремі сторінки ЖК, як у LUN: планування, хід будівництва, контакти відділу продажів, новини.

-- Планування квартири (картинка). Один план на кілька однакових квартир: сторінка «Layouts»
-- групує квартири за типом і площею й бере план із будь-якої квартири групи.
alter table public.listings
  add column if not exists floorplan text not null default '' check (length(floorplan) <= 500);
grant select (floorplan) on public.listings to anon, authenticated;
grant insert (floorplan), update (floorplan) on public.listings to authenticated;

-- Відділ продажів: адреса офісу й години роботи
alter table public.developments
  add column if not exists office text not null default '' check (length(office) <= 160),
  add column if not exists hours  text not null default '' check (length(hours) <= 200);

-- Хід будівництва: фото за місяць, для всього ЖК або окремого дому
create table if not exists public.development_progress (
  id             uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments(id) on delete cascade,
  building_id    uuid references public.buildings(id) on delete set null,
  month          date not null,
  photos         text[] not null default '{}',
  note           text not null default '' check (length(note) <= 500),
  created_at     timestamptz not null default now()
);
create index if not exists development_progress_dev_idx on public.development_progress (development_id, month desc);

-- Новини ЖК: старт продажів, зміна цін, етапи будівництва
create table if not exists public.development_news (
  id             uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments(id) on delete cascade,
  title          text not null check (length(title) between 1 and 160),
  body           text not null default '' check (length(body) <= 4000),
  photo          text not null default '' check (length(photo) <= 500),
  published_on   date not null default current_date,
  created_at     timestamptz not null default now()
);
create index if not exists development_news_dev_idx on public.development_news (development_id, published_on desc);

alter table public.development_progress enable row level security;
alter table public.development_news enable row level security;

create policy development_progress_read on public.development_progress for select using (
  exists (select 1 from public.developments d where d.id = development_progress.development_id)
);
create policy development_progress_write on public.development_progress for all to authenticated
  using (exists (select 1 from public.developments d where d.id = development_progress.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_progress.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())));

create policy development_news_read on public.development_news for select using (
  exists (select 1 from public.developments d where d.id = development_news.development_id)
);
create policy development_news_write on public.development_news for all to authenticated
  using (exists (select 1 from public.developments d where d.id = development_news.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_news.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())));

grant select on public.development_progress, public.development_news to anon, authenticated;
grant insert, update, delete on public.development_progress, public.development_news to authenticated;
