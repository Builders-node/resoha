-- ЖК (новобудова) — окрема сутність зі своєю сторінкою. Квартири в ньому —
-- звичайні оголошення з посиланням на ЖК, номером, поверхом і станом
-- (вільна / бронь / продана / здана), кожна на продаж або в оренду.

create table if not exists public.developments (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (length(name) between 1 and 120),
  developer    text not null default '',
  completion   text not null default '',
  sales        text not null default 'open' check (sales in ('open', 'presale', 'closed')),
  website      text not null default '',
  island       text not null default 'Roatán',
  neighborhood text not null,
  address      text not null default '',
  lat          double precision not null,
  lng          double precision not null,
  photos       text[] not null default '{}',
  body         text not null default '',
  agent_id     uuid not null references public.profiles(id) on delete cascade,
  agency_id    uuid references public.agencies(id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists developments_agent_idx on public.developments (agent_id);

alter table public.developments enable row level security;

-- ті самі правила, що й для оголошень: бачать усі активні ЖК активних ріелторів,
-- змінює автор, власник агенції або адмін
create policy developments_read on public.developments for select using (
  (active and exists (select 1 from public.profiles p where p.id = developments.agent_id and p.active))
  or agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin()
);
create policy developments_insert on public.developments for insert to authenticated
  with check (agent_id = (select auth.uid()) or public.is_admin());
create policy developments_update on public.developments for update
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin())
  with check (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());
create policy developments_delete on public.developments for delete
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());

-- агенція ЖК завжди йде слідом за ріелтором; автора й дату міняє лише адмін
create or replace function public.developments_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' or (public.is_admin() and new.agent_id is distinct from old.agent_id) then
    new.agency_id := (select agency_id from public.profiles where id = new.agent_id and role = 'agent');
    if tg_op = 'INSERT' then new.created_at := now(); end if;
    return new;
  end if;
  if not public.is_admin() and (new.agent_id is distinct from old.agent_id
     or new.agency_id is distinct from old.agency_id or new.created_at is distinct from old.created_at) then
    raise exception 'Only an admin can change this' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger developments_guard before insert or update on public.developments
  for each row execute function public.developments_guard();

grant select on public.developments to anon, authenticated;
grant insert, update, delete on public.developments to authenticated;

-- Квартира = оголошення в ЖК
alter table public.listings
  add column development_id uuid references public.developments(id) on delete set null,
  add column unit_no text not null default '' check (length(unit_no) <= 20),
  add column floor int check (floor between -10 and 300),
  add column status text not null default 'available'
    check (status in ('available', 'reserved', 'sold', 'rented'));
create index if not exists listings_development_idx on public.listings (development_id);

-- На listings діють поколоночні гранти — нові колонки відкриваємо явно
grant select (development_id, unit_no, floor, status) on public.listings to anon, authenticated;
grant insert (development_id, unit_no, floor, status), update (development_id, unit_no, floor, status)
  on public.listings to authenticated;
