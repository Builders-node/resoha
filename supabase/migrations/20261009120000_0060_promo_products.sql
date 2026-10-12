-- Види просування, повернення грошей і «до/після».
--
-- 1. Окрім Featured, оголошення можна просунути інакше: top (місце «Sponsored» угорі
--    пошуку), highlight (кольорова картка), homepage (місце на головній), bump (разово
--    підняти в «нових») і premium_agent (на сторінці оголошення — лише цей ріелтор).
--    Вид живе в promo_packages.product і promo_campaigns.product; живі види оголошення
--    promo_apply складає в listings.promo_flags, а bump пише listings.fresh_at.
-- 2. Повернення: адмін (через Stripe API) або вебхук Stripe (charge.refunded / refund.*)
--    кличуть promo_refunded — кампанія скасовується, позначки знімаються.
-- 3. promo_effect — перегляди й заявки за кампанію проти такого самого вікна до неї.
--
-- Міграція ідемпотентна; без DELETE і без DROP POLICY.

/* ---------- вид просування ---------- */
alter table public.promo_packages  add column if not exists product text not null default 'featured';
alter table public.promo_campaigns add column if not exists product text not null default 'featured';

alter table public.promo_packages drop constraint if exists promo_packages_product_check;
alter table public.promo_packages add constraint promo_packages_product_check
  check (product in ('featured', 'top', 'highlight', 'homepage', 'bump', 'premium_agent'));
alter table public.promo_campaigns drop constraint if exists promo_campaigns_product_check;
alter table public.promo_campaigns add constraint promo_campaigns_product_check
  check (product in ('featured', 'top', 'highlight', 'homepage', 'bump', 'premium_agent'));

-- той самий строк тепер може бути в кількох видів
alter table public.promo_packages drop constraint if exists promo_packages_target_kind_days_key;
create unique index if not exists promo_packages_kind_product_days_key
  on public.promo_packages (target_kind, product, days);

-- Стартові ціни нових видів (заглушки — адмін міняє їх на вкладці Promotions).
-- Це єдине місце, де вони задані; далі ціни живуть лише в promo_packages.
insert into public.promo_packages (target_kind, product, days, price_cents) values
  ('listing', 'top',           7, 2000), ('listing', 'top',           14, 3500), ('listing', 'top',           30, 6000),
  ('listing', 'highlight',     7,  800), ('listing', 'highlight',     14, 1400), ('listing', 'highlight',     30, 2500),
  ('listing', 'homepage',      7, 2500), ('listing', 'homepage',      14, 4500), ('listing', 'homepage',      30, 8000),
  ('listing', 'bump',          1,  500),
  ('listing', 'premium_agent', 7, 1500), ('listing', 'premium_agent', 14, 2500), ('listing', 'premium_agent', 30, 4500)
on conflict (target_kind, product, days) do nothing;

/* ---------- повернення ---------- */
alter table public.promo_campaigns
  add column if not exists refunded_at  timestamptz,
  add column if not exists refund_cents int  not null default 0,
  add column if not exists refund_ref   text not null default '';

create index if not exists promo_campaigns_pay_ref_idx on public.promo_campaigns (pay_ref) where pay_ref <> '';

/* ---------- позначки на оголошенні ---------- */
-- Платні позначки — не зміна оголошення: «оновлено» на сторінці від них не рухається.
-- (Замінюємо до заповнення fresh_at нижче, щоб і воно не зсунуло updated_at.)
create or replace function public.touch_listing()
returns trigger language plpgsql set search_path = public as $$
begin
  if (to_jsonb(new) - 'views' - 'updated_at' - 'promo_flags' - 'bumped_at' - 'fresh_at' - 'featured' - 'featured_rank')
     is distinct from
     (to_jsonb(old) - 'views' - 'updated_at' - 'promo_flags' - 'bumped_at' - 'fresh_at' - 'featured' - 'featured_rank') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

-- promo_flags — живі види просування (без bump); fresh_at — дата для сортування «нові»:
-- дата публікації або останнього bump. Пише їх лише promo_apply / promo_activate.
alter table public.listings
  add column if not exists promo_flags text[] not null default '{}',
  add column if not exists bumped_at  timestamptz,
  add column if not exists fresh_at   timestamptz;
update public.listings set fresh_at = coalesce(bumped_at, created_at) where fresh_at is null;
alter table public.listings alter column fresh_at set default now();
alter table public.listings alter column fresh_at set not null;

-- на listings поколоночні гранти: читати відкриваємо, писати — ні (лише функції нижче)
grant select (promo_flags, bumped_at, fresh_at) on public.listings to anon, authenticated;

create index if not exists listings_promo_flags_idx on public.listings using gin (promo_flags);
create index if not exists listings_fresh_idx on public.listings (fresh_at desc);

/* ---------- функції ---------- */

/**
 * Перерахувати позначки обʼєкта: featured = ручна позначка адміна або живий Featured;
 * для оголошення ще й promo_flags — усі живі види, крім разового bump.
 */
create or replace function public.promo_apply(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_table text := case p_kind when 'listing' then 'listings' when 'development' then 'developments'
                   when 'building' then 'buildings' when 'agency' then 'agencies' end;
  v_live boolean;
  v_flags text[];
begin
  if v_table is null then return; end if;
  v_live := exists (select 1 from public.promo_campaigns c
    where c.target_kind = p_kind and c.target_id = p_id and c.status = 'active' and c.product = 'featured'
      and c.starts_at <= now() and c.ends_at > now());
  execute format(
    'update public.%I t set featured = t.featured_manual or $1,
       featured_rank = case when not t.featured and (t.featured_manual or $1)
         then coalesce((select max(featured_rank) from public.%I where featured), 0) + 1
         else t.featured_rank end
     where t.id = $2 and t.featured is distinct from (t.featured_manual or $1)', v_table, v_table)
  using v_live, p_id;

  if p_kind = 'listing' then
    select coalesce(array_agg(distinct c.product order by c.product), '{}') into v_flags
      from public.promo_campaigns c
      where c.target_kind = 'listing' and c.target_id = p_id and c.status = 'active' and c.product <> 'bump'
        and c.starts_at <= now() and c.ends_at > now();
    update public.listings set promo_flags = v_flags where id = p_id and promo_flags is distinct from v_flags;
  end if;
end $$;

/** Нова заявка: вид, ціну й строк беремо з пакета, а не від клієнта. */
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
  -- стара неоплачена заявка того самого виду на той самий обʼєкт — більше не потрібна
  update public.promo_campaigns set status = 'cancelled'
    where owner_id = auth.uid() and target_kind = p_kind and target_id = p_target
      and product = v_pkg.product and status = 'pending';

  insert into public.promo_campaigns (owner_id, target_kind, target_id, target_name, package_id, product, days, price_cents, currency)
  values (auth.uid(), p_kind, p_target, public.promo_target_name(p_kind, p_target), v_pkg.id, v_pkg.product,
          v_pkg.days, v_pkg.price_cents, v_pkg.currency)
  returning * into v_row;
  return v_row;
end $$;

/**
 * Оплата підтверджена. Кампанія того самого виду, що вже йде, подовжується — нова
 * стартує після неї. Bump діє одразу: оголошення стає першим у «нових».
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

  if v_row.product = 'bump' then
    v_start := now();
  else
    select greatest(now(), coalesce(max(ends_at), now())) into v_start from public.promo_campaigns
      where target_kind = v_row.target_kind and target_id = v_row.target_id and product = v_row.product
        and status = 'active' and ends_at > now();
  end if;

  update public.promo_campaigns set
    status = 'active', paid_at = now(), starts_at = v_start,
    ends_at = v_start + make_interval(days => days),
    pay_method = case when p_method in ('stripe', 'manual') then p_method else 'manual' end,
    pay_ref = left(coalesce(p_ref, ''), 200)
  where id = p_id returning * into v_row;

  if v_row.product = 'bump' and v_row.target_kind = 'listing' then
    update public.listings set bumped_at = now(), fresh_at = now() where id = v_row.target_id;
  end if;

  perform public.promo_apply(v_row.target_kind, v_row.target_id);
  return v_row;
end $$;

/**
 * Гроші повернули: адмін — за id кампанії, вебхук Stripe — за платежем (pay_ref) із секретом.
 * Кампанія скасовується (завершена лишається завершеною), позначки знімаються, bump — відкочується.
 * Повторний виклик безпечний: вебхук може прийти і після кнопки адміна.
 */
create or replace function public.promo_refunded(
  p_id uuid, p_ref text default '', p_amount int default null, p_refund_ref text default '', p_secret text default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  r public.promo_campaigns;
  n int := 0;
begin
  if not public.is_admin()
     and (p_secret is null or p_secret <> (select secret from private.promo_config where id = 1)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  for r in
    select * from public.promo_campaigns
    where (p_id is not null and id = p_id)
       or (p_id is null and coalesce(p_ref, '') <> '' and pay_ref = p_ref)
    for update
  loop
    update public.promo_campaigns set
      status = case when status in ('pending', 'active') then 'cancelled' else status end,
      ends_at = case when status = 'active' and ends_at > now() then greatest(starts_at, now()) else ends_at end,
      refunded_at = coalesce(refunded_at, now()),
      refund_cents = least(price_cents, greatest(refund_cents, coalesce(p_amount, price_cents))),
      refund_ref = case when refund_ref = '' then left(coalesce(p_refund_ref, ''), 200) else refund_ref end
    where id = r.id;
    if r.product = 'bump' and r.target_kind = 'listing' and r.status = 'active' then
      update public.listings set bumped_at = null, fresh_at = created_at where id = r.target_id;
    end if;
    perform public.promo_apply(r.target_kind, r.target_id);
    n := n + 1;
  end loop;
  return n;
end $$;

/**
 * Ефект кампанії: перегляди сторінки й заявки за час кампанії (до сьогодні)
 * проти вікна такої самої довжини перед стартом. Лише для оголошень і ЖК,
 * лише власнику кампанії або адміну.
 */
create or replace function public.promo_effect(p_ids uuid[])
returns table (campaign_id uuid, window_days numeric, views_before bigint, views_during bigint, leads_before bigint, leads_during bigint)
language sql stable security definer set search_path = public as $$
  with c as (
    select c.id, c.target_kind, c.target_id, c.starts_at as s, least(now(), c.ends_at) as e
    from public.promo_campaigns c
    where c.id = any(p_ids[1:200]) and c.status in ('active', 'ended')
      and c.starts_at is not null and c.starts_at < now()
      and c.target_kind in ('listing', 'development')
      and (c.owner_id = auth.uid() or public.is_admin())
  )
  select c.id,
    round((extract(epoch from (c.e - c.s)) / 86400)::numeric, 1),
    (select count(*) from public.listing_events ev
      where (case when c.target_kind = 'listing' then ev.kind = 'view' and ev.listing_id = c.target_id
                  else ev.kind = 'dev_view' and ev.development_id = c.target_id end)
        and ev.created_at >= c.s - (c.e - c.s) and ev.created_at < c.s),
    (select count(*) from public.listing_events ev
      where (case when c.target_kind = 'listing' then ev.kind = 'view' and ev.listing_id = c.target_id
                  else ev.kind = 'dev_view' and ev.development_id = c.target_id end)
        and ev.created_at >= c.s and ev.created_at < c.e),
    (select count(*) from public.leads l
      where (case when c.target_kind = 'listing' then l.listing_id = c.target_id
                  else l.listing_id in (select u.id from public.listings u where u.development_id = c.target_id) end)
        and l.created_at >= c.s - (c.e - c.s) and l.created_at < c.s),
    (select count(*) from public.leads l
      where (case when c.target_kind = 'listing' then l.listing_id = c.target_id
                  else l.listing_id in (select u.id from public.listings u where u.development_id = c.target_id) end)
        and l.created_at >= c.s and l.created_at < c.e)
  from c
$$;

revoke all on function public.promo_refunded(uuid, text, int, text, text) from public;
revoke all on function public.promo_effect(uuid[]) from public, anon;
-- вебхук Stripe приходить без сесії (anon): його пускає лише секрет
grant execute on function public.promo_refunded(uuid, text, int, text, text) to anon, authenticated;
grant execute on function public.promo_effect(uuid[]) to authenticated;

-- позначки вже живих кампаній — у promo_flags
do $$
declare r record;
begin
  for r in select distinct target_id from public.promo_campaigns where target_kind = 'listing' and status = 'active' loop
    perform public.promo_apply('listing', r.target_id);
  end loop;
end $$;
