-- «Паспорт ділянки»: що відомо про землю, крім ціни й площі. Окрема таблиця,
-- щоб listings не обростала полями, які мають сенс лише для type = land.
create table public.land_facts (
  listing_id   uuid primary key references public.listings(id) on delete cascade,
  title_status text not null default 'unknown' check (title_status in ('registered', 'in_progress', 'none', 'unknown')),
  survey       text not null default 'unknown' check (survey in ('yes', 'no', 'unknown')),
  road_access  text not null default 'unknown' check (road_access in ('paved', 'gravel', 'none', 'unknown')),
  power        text not null default 'unknown' check (power in ('at_lot', 'nearby', 'none', 'unknown')),
  water        text not null default 'unknown' check (water in ('well', 'cistern', 'municipal', 'none', 'unknown')),
  zolitur      text not null default 'unknown' check (zolitur in ('yes', 'no', 'unknown')),
  zone         text not null default 'unknown' check (zone in ('residential', 'tourism', 'protected', 'unknown')),
  slope        text not null default 'unknown' check (slope in ('flat', 'moderate', 'steep', 'unknown')),
  -- «готова до будівництва» = титул, дорога, світло й вода на місці; те саме правило в lib/land.ts
  ready        boolean generated always as (
    title_status = 'registered'
    and road_access in ('paved', 'gravel')
    and power in ('at_lot', 'nearby')
    and water in ('well', 'cistern', 'municipal')
  ) stored,
  checked_by   uuid references public.profiles(id) on delete set null,
  checked_at   timestamptz
);

-- Хто й коли відповів: ставимо самі, коли хоч одне поле не unknown
create or replace function public.land_facts_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.title_status = 'unknown' and new.survey = 'unknown' and new.road_access = 'unknown'
     and new.power = 'unknown' and new.water = 'unknown' and new.zolitur = 'unknown'
     and new.zone = 'unknown' and new.slope = 'unknown' then
    new.checked_by := null;
    new.checked_at := null;
  else
    new.checked_by := coalesce(auth.uid(), new.checked_by);
    new.checked_at := now();
  end if;
  return new;
end $$;

create trigger land_facts_stamp before insert or update on public.land_facts
  for each row execute function public.land_facts_stamp();

revoke all on function public.land_facts_stamp() from public, anon, authenticated;

alter table public.land_facts enable row level security;

-- читати можна те, чиє оголошення видно (RLS listings спрацьовує всередині підзапиту)
create policy land_facts_read on public.land_facts for select
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy land_facts_write on public.land_facts for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id
                 and (l.agent_id = (select auth.uid()) or public.is_agency_owner(l.agency_id) or public.is_admin())))
  with check (exists (select 1 from public.listings l where l.id = listing_id
                 and (l.agent_id = (select auth.uid()) or public.is_agency_owner(l.agency_id) or public.is_admin())));

grant select on public.land_facts to anon, authenticated;
grant insert (listing_id, title_status, survey, road_access, power, water, zolitur, zone, slope),
      update (title_status, survey, road_access, power, water, zolitur, zone, slope),
      delete on public.land_facts to authenticated;
