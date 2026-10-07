-- Платне просування. Ріелтор, агенція чи забудовник купує «Featured» для свого
-- оголошення, ЖК, дому або агенції на N днів. Поки кампанія йде, обʼєкт має
-- featured = true — тож усе, що вже ставить Featured першим (головна, пошук, каталоги),
-- працює і для платних. Коли строк виходить, promo_sweep знімає позначку сама.
--
-- Позначку адміна і платну не плутаємо: featured_manual — те, що поставив адмін
-- зірочкою; featured = featured_manual або є активна кампанія.

/* ---------- позначка адміна окремо від платної ---------- */
alter table public.listings     add column if not exists featured_manual boolean not null default false;
alter table public.developments add column if not exists featured_manual boolean not null default false;
alter table public.buildings    add column if not exists featured_manual boolean not null default false;
alter table public.agencies
  add column if not exists featured boolean not null default false,
  add column if not exists featured_rank int not null default 0,
  add column if not exists featured_manual boolean not null default false;

update public.listings     set featured_manual = featured where featured_manual is distinct from featured;
update public.developments set featured_manual = featured where featured_manual is distinct from featured;
update public.buildings    set featured_manual = featured where featured_manual is distinct from featured;

-- на agencies поколоночні гранти (invite_code схований) — нові колонки відкриваємо явно
grant select (featured, featured_rank) on public.agencies to anon, authenticated;

-- агенцію теж стереже featured_guard з 0044: її власник не може сам себе відмітити
drop trigger if exists agencies_featured_guard on public.agencies;
create trigger agencies_featured_guard before insert or update on public.agencies
  for each row execute function public.featured_guard();

-- Адмін міняє featured через API (роль authenticated) — це його ручна позначка.
-- Функції просування працюють як власник таблиць і ручну позначку не чіпають.
create or replace function public.featured_manual_sync()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.featured_manual := coalesce(new.featured, false);
    elsif new.featured is distinct from old.featured then
      new.featured_manual := new.featured;
    elsif new.featured_manual is distinct from old.featured_manual then
      new.featured_manual := old.featured_manual;
    end if;
  end if;
  return new;
end $$;

-- імʼя після *_featured_guard: тригери йдуть за алфавітом, спершу перевірка прав
drop trigger if exists listings_featured_sync on public.listings;
create trigger listings_featured_sync before insert or update on public.listings
  for each row execute function public.featured_manual_sync();
drop trigger if exists developments_featured_sync on public.developments;
create trigger developments_featured_sync before insert or update on public.developments
  for each row execute function public.featured_manual_sync();
drop trigger if exists buildings_featured_sync on public.buildings;
create trigger buildings_featured_sync before insert or update on public.buildings
  for each row execute function public.featured_manual_sync();
drop trigger if exists agencies_featured_sync on public.agencies;
create trigger agencies_featured_sync before insert or update on public.agencies
  for each row execute function public.featured_manual_sync();

-- дошка агенцій віддає й позначку, щоб Featured-агенції йшли першими
create or replace view public.agency_board
with (security_invoker = true) as
select
  ag.id, ag.name, ag.brand, ag.phone, ag.email, ag.about, ag.verified, ag.owner_id, ag.created_at,
  (select count(*) from public.listings l where l.agency_id = ag.id and l.active) as listings_count,
  (select count(*) from public.agency_members m join public.profiles p on p.id = m.profile_id
    where m.agency_id = ag.id and p.role = 'agent')                                as agents_count,
  ag.featured, ag.featured_rank
from public.agencies ag;

/* ---------- пакети (ціни) ---------- */
create table if not exists public.promo_packages (
  id          uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('listing', 'development', 'building', 'agency')),
  days        int  not null check (days between 1 and 365),
  price_cents int  not null check (price_cents >= 0),
  currency    text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (target_kind, days)
);

alter table public.promo_packages enable row level security;
drop policy if exists promo_packages_read on public.promo_packages;
create policy promo_packages_read on public.promo_packages for select using (active or public.is_admin());
drop policy if exists promo_packages_admin on public.promo_packages;
create policy promo_packages_admin on public.promo_packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- стартові ціни-заглушки: адмін міняє їх на вкладці Promotions
insert into public.promo_packages (target_kind, days, price_cents) values
  ('listing', 7, 1500), ('listing', 14, 2500), ('listing', 30, 4500),
  ('building', 7, 3000), ('building', 14, 5000), ('building', 30, 9000),
  ('development', 7, 5000), ('development', 14, 9000), ('development', 30, 16000),
  ('agency', 7, 4000), ('agency', 14, 7000), ('agency', 30, 12000)
on conflict (target_kind, days) do nothing;

/* ---------- кампанії ---------- */
create table if not exists public.promo_campaigns (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  target_kind  text not null check (target_kind in ('listing', 'development', 'building', 'agency')),
  target_id    uuid not null,
  target_name  text not null default '',
  package_id   uuid references public.promo_packages(id) on delete set null,
  days         int  not null check (days between 1 and 365),
  price_cents  int  not null check (price_cents >= 0),
  currency     text not null default 'usd',
  -- pending — чекає оплати; active — оплачено (може стартувати пізніше, див. starts_at);
  -- ended — строк вийшов; cancelled — скасовано до чи після оплати
  status       text not null default 'pending' check (status in ('pending', 'active', 'ended', 'cancelled')),
  pay_method   text not null default '' check (pay_method in ('', 'stripe', 'manual')),
  pay_ref      text not null default '',
  stripe_session text unique,
  paid_at      timestamptz,
  starts_at    timestamptz,
  ends_at      timestamptz,
  impressions  int not null default 0,
  clicks       int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists promo_campaigns_owner_idx  on public.promo_campaigns (owner_id, created_at desc);
create index if not exists promo_campaigns_target_idx on public.promo_campaigns (target_kind, target_id, status);
create index if not exists promo_campaigns_live_idx   on public.promo_campaigns (ends_at) where status = 'active';

alter table public.promo_campaigns enable row level security;
drop policy if exists promo_campaigns_read on public.promo_campaigns;
create policy promo_campaigns_read on public.promo_campaigns for select
  using (owner_id = (select auth.uid()) or public.is_admin());
-- писати напряму не можна: лише через функції нижче
revoke insert, update, delete on public.promo_campaigns from anon, authenticated;

/* ---------- секрет сервера для підтвердження оплати ---------- */
-- Ключа service_role у застосунку немає, тому сервер доводить «оплату перевірено в Stripe»
-- спільним секретом. Схема private не віддається через API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.promo_config (
  id     int primary key default 1 check (id = 1),
  secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into private.promo_config (id) values (1) on conflict (id) do nothing;

/* ---------- чи може поточний користувач просувати цей обʼєкт ---------- */
create or replace function public.promo_can_manage(p_kind text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'listing' then exists (select 1 from public.listings l where l.id = p_id
      and (l.agent_id = auth.uid() or public.is_agency_owner(l.agency_id)))
    when 'development' then exists (select 1 from public.developments d where d.id = p_id
      and (d.agent_id = auth.uid() or public.is_agency_owner(d.agency_id)))
    when 'building' then exists (select 1 from public.buildings b join public.developments d on d.id = b.development_id
      where b.id = p_id and (d.agent_id = auth.uid() or public.is_agency_owner(d.agency_id)))
    when 'agency' then public.is_agency_owner(p_id)
    else false
  end or public.is_admin()
$$;

/** Назва обʼєкта — щоб у списку кампаній було видно, що просувається, навіть після видалення. */
create or replace function public.promo_target_name(p_kind text, p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(case p_kind
    when 'listing' then (select title from public.listings where id = p_id)
    when 'development' then (select name from public.developments where id = p_id)
    when 'building' then (select b.name || ' · ' || d.name from public.buildings b
      join public.developments d on d.id = b.development_id where b.id = p_id)
    when 'agency' then (select name from public.agencies where id = p_id)
  end, '')
$$;

/**
 * Перерахувати featured одного обʼєкта: ручна позначка адміна або активна кампанія.
 * Новий платний обʼєкт стає в кінець черги Featured.
 */
create or replace function public.promo_apply(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_table text := case p_kind when 'listing' then 'listings' when 'development' then 'developments'
                   when 'building' then 'buildings' when 'agency' then 'agencies' end;
  v_live boolean;
begin
  if v_table is null then return; end if;
  v_live := exists (select 1 from public.promo_campaigns c
    where c.target_kind = p_kind and c.target_id = p_id and c.status = 'active'
      and c.starts_at <= now() and c.ends_at > now());
  execute format(
    'update public.%I t set featured = t.featured_manual or $1,
       featured_rank = case when not t.featured and (t.featured_manual or $1)
         then coalesce((select max(featured_rank) from public.%I where featured), 0) + 1
         else t.featured_rank end
     where t.id = $2 and t.featured is distinct from (t.featured_manual or $1)', v_table, v_table)
  using v_live, p_id;
end $$;

/** Нова заявка на просування: ціну й строк беремо з пакета, а не від клієнта. */
create or replace function public.promo_create(p_kind text, p_target uuid, p_package uuid)
returns public.promo_campaigns language plpgsql security definer set search_path = public as $$
declare
  v_pkg public.promo_packages;
  v_row public.promo_campaigns;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into v_pkg from public.promo_packages where id = p_package and active;
  if v_pkg.id is null or v_pkg.target_kind <> p_kind then
    raise exception 'This package is not available' using errcode = '22023';
  end if;
  if not public.promo_can_manage(p_kind, p_target) then
    raise exception 'You can only promote your own items' using errcode = '42501';
  end if;
  -- старі неоплачені заявки на той самий обʼєкт прибираємо, щоб не висіли дублями
  update public.promo_campaigns set status = 'cancelled'
    where owner_id = auth.uid() and target_kind = p_kind and target_id = p_target and status = 'pending';

  insert into public.promo_campaigns (owner_id, target_kind, target_id, target_name, package_id, days, price_cents, currency)
  values (auth.uid(), p_kind, p_target, public.promo_target_name(p_kind, p_target), v_pkg.id, v_pkg.days, v_pkg.price_cents, v_pkg.currency)
  returning * into v_row;
  return v_row;
end $$;

/** Сесію Stripe Checkout привʼязуємо до заявки (сама по собі нічого не активує). */
create or replace function public.promo_set_session(p_id uuid, p_session text)
returns void language sql security definer set search_path = public as $$
  update public.promo_campaigns set stripe_session = p_session
  where id = p_id and status = 'pending' and (owner_id = auth.uid() or public.is_admin());
$$;

/**
 * Оплата підтверджена: адміном вручну або сервером після перевірки в Stripe (з секретом).
 * Якщо обʼєкт уже просувається, нова кампанія починається після попередньої — дні додаються.
 * Повторний виклик нічого не ламає (вебхук і редірект зі Stripe можуть прийти обидва).
 */
create or replace function public.promo_activate(p_id uuid, p_method text, p_ref text default '', p_secret text default null)
returns public.promo_campaigns language plpgsql security definer set search_path = public as $$
declare
  v_row public.promo_campaigns;
  v_start timestamptz;
begin
  if not public.is_admin()
     and (p_secret is null or p_secret <> (select secret from private.promo_config where id = 1)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_row from public.promo_campaigns where id = p_id for update;
  if v_row.id is null then raise exception 'Campaign not found' using errcode = 'P0002'; end if;
  if v_row.status <> 'pending' then return v_row; end if;

  select greatest(now(), coalesce(max(ends_at), now())) into v_start from public.promo_campaigns
    where target_kind = v_row.target_kind and target_id = v_row.target_id and status = 'active' and ends_at > now();

  update public.promo_campaigns set
    status = 'active', paid_at = now(), starts_at = v_start,
    ends_at = v_start + make_interval(days => days),
    pay_method = case when p_method in ('stripe', 'manual') then p_method else 'manual' end,
    pay_ref = left(coalesce(p_ref, ''), 200)
  where id = p_id returning * into v_row;

  perform public.promo_apply(v_row.target_kind, v_row.target_id);
  return v_row;
end $$;

/** Скасувати: власник — лише неоплачену заявку, адмін — будь-яку. */
create or replace function public.promo_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row public.promo_campaigns;
begin
  select * into v_row from public.promo_campaigns where id = p_id;
  if v_row.id is null then return; end if;
  if not (public.is_admin() or (v_row.owner_id = auth.uid() and v_row.status = 'pending')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.promo_campaigns set status = 'cancelled' where id = p_id;
  perform public.promo_apply(v_row.target_kind, v_row.target_id);
end $$;

/**
 * Прибирання: кампанії, чий строк вийшов, — ended; позначки перераховуємо для всього,
 * що щойно стартувало або закінчилось. Ідемпотентне, тож його можна кликати звідусіль.
 */
create or replace function public.promo_sweep()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  update public.promo_campaigns set status = 'ended' where status = 'active' and ends_at <= now();
  for r in
    select distinct target_kind, target_id from public.promo_campaigns
    where (status = 'active') or (status in ('ended', 'cancelled') and coalesce(ends_at, created_at) > now() - interval '2 days')
  loop
    perform public.promo_apply(r.target_kind, r.target_id);
    n := n + 1;
  end loop;
  return n;
end $$;

/** Покази (обʼєкт був у списку) і переходи (відкрили його сторінку) — лише для кампаній, що йдуть зараз. */
create or replace function public.promo_track(p_kind text, p_ids uuid[], p_field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_field = 'impression' then
    update public.promo_campaigns set impressions = impressions + 1
      where target_kind = p_kind and target_id = any(p_ids[1:60]) and status = 'active'
        and starts_at <= now() and ends_at > now();
  elsif p_field = 'click' then
    update public.promo_campaigns set clicks = clicks + 1
      where target_kind = p_kind and target_id = any(p_ids[1:60]) and status = 'active'
        and starts_at <= now() and ends_at > now();
  end if;
end $$;

revoke all on function public.promo_can_manage(text, uuid) from public, anon;
revoke all on function public.promo_target_name(text, uuid) from public, anon, authenticated;
revoke all on function public.promo_apply(text, uuid) from public, anon, authenticated;
revoke all on function public.promo_create(text, uuid, uuid) from public, anon;
revoke all on function public.promo_set_session(uuid, text) from public, anon;
revoke all on function public.promo_cancel(uuid) from public, anon;
revoke all on function public.promo_activate(uuid, text, text, text) from public;
revoke all on function public.promo_sweep() from public;
revoke all on function public.promo_track(text, uuid[], text) from public;

grant execute on function public.promo_can_manage(text, uuid) to authenticated;
grant execute on function public.promo_create(text, uuid, uuid) to authenticated;
grant execute on function public.promo_set_session(uuid, text) to authenticated;
grant execute on function public.promo_cancel(uuid) to authenticated;
-- вебхук Stripe приходить без сесії (anon): його пускає лише секрет
grant execute on function public.promo_activate(uuid, text, text, text) to anon, authenticated;
grant execute on function public.promo_sweep() to anon, authenticated;
grant execute on function public.promo_track(text, uuid[], text) to anon, authenticated;

/* ---------- автоматичне завершення кожні 10 хвилин ---------- */
-- Якщо pg_cron недоступний, міграція не падає: застосунок і так кличе promo_sweep.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'promo-sweep';
  perform cron.schedule('promo-sweep', '*/10 * * * *', 'select public.promo_sweep()');
exception when others then
  raise notice 'pg_cron unavailable (%), promo_sweep runs from the app only', sqlerrm;
end $$;

-- журнал адміна знає про кампанії
alter table public.admin_log drop constraint if exists admin_log_target_kind_check;
alter table public.admin_log add constraint admin_log_target_kind_check
  check (target_kind in ('listing', 'profile', 'agency', 'review', 'development', 'building', 'campaign'));
