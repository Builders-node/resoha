-- «Featured» не лише для оголошень: адмін відмічає зіркою ЖК і окремі доми,
-- вони виходять на головну. featured_rank — порядок показу (менше = вище),
-- його адмін міняє стрілками на вкладці Featured.

alter table public.developments
  add column if not exists featured boolean not null default false,
  add column if not exists featured_rank int not null default 0;
alter table public.buildings
  add column if not exists featured boolean not null default false,
  add column if not exists featured_rank int not null default 0;
alter table public.listings
  add column if not exists featured_rank int not null default 0;

-- на listings поколоночні гранти — нову колонку відкриваємо явно
grant select (featured_rank) on public.listings to anon, authenticated;
grant update (featured_rank) on public.listings to authenticated;

-- Пометку і порядок міняє лише адмін. Окремий тригер, щоб не переписувати
-- listings_guard / developments_guard.
create or replace function public.featured_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.featured_rank := 0;
    if tg_table_name <> 'listings' then new.featured := false; end if;
    return new;
  end if;
  if new.featured_rank is distinct from old.featured_rank
     or (tg_table_name <> 'listings' and new.featured is distinct from old.featured) then
    raise exception 'Only an admin can change this' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists developments_featured_guard on public.developments;
create trigger developments_featured_guard before insert or update on public.developments
  for each row execute function public.featured_guard();
drop trigger if exists buildings_featured_guard on public.buildings;
create trigger buildings_featured_guard before insert or update on public.buildings
  for each row execute function public.featured_guard();
drop trigger if exists listings_featured_guard on public.listings;
create trigger listings_featured_guard before insert or update on public.listings
  for each row execute function public.featured_guard();

create index if not exists developments_featured_idx on public.developments (featured_rank) where featured;
create index if not exists buildings_featured_idx on public.buildings (featured_rank) where featured;

-- журнал адміна тепер знає і про ЖК з домами
alter table public.admin_log drop constraint if exists admin_log_target_kind_check;
alter table public.admin_log add constraint admin_log_target_kind_check
  check (target_kind in ('listing', 'profile', 'agency', 'review', 'development', 'building'));
