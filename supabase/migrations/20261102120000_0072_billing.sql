-- Підписки (тарифи) для агенцій, незалежних ріелторів і забудовників — Stripe Billing.
--
-- 1. billing_plans — тарифи з цінами, лімітами й бонусними просуваннями на місяць.
--    Ціни й ліміти міняє адмін на вкладці Billing; стартові значення — нижче.
-- 2. billing_subscriptions — підписка «акаунта»: агенції (subject_kind = 'agency') або
--    ріелтора без агенції ('agent'). Пише лише сервер (вебхук Stripe, із секретом
--    private.promo_config) або адмін (ручний тариф, напр. подарунок першим партнерам).
-- 3. Ліміти — мʼякі: опубліковане лишається, але нове оголошення, ЖК чи член команди
--    понад ліміт не додається. Перевірку вмикає адмін (private.billing_config.enforce),
--    до того тарифи лише показуються й продаються.
-- 4. billing_use_credit — бонусне просування з тарифу: кампанія за $0, одразу активна.
--
-- Міграція ідемпотентна; без DELETE і без DROP POLICY.

/* ---------- тарифи ---------- */
create table if not exists public.billing_plans (
  id               text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  -- free — тариф за замовчуванням для всіх; agency і developer — дві лінійки платних
  audience         text not null check (audience in ('free', 'agency', 'developer')),
  name             text not null check (length(name) between 1 and 60),
  blurb            text not null default '' check (length(blurb) <= 300),
  price_month_cents int not null default 0 check (price_month_cents >= 0),
  price_year_cents  int not null default 0 check (price_year_cents >= 0),
  currency         text not null default 'usd',
  -- null — без ліміту. Оголошення рахуються лише вторинні (квартири ЖК — у ліміті ЖК)
  max_listings     int check (max_listings >= 0),
  max_developments int check (max_developments >= 0),
  max_seats        int check (max_seats >= 1),
  -- бонусні просування на кожен місяць підписки: [{product, kind, days, count}]
  credits          jsonb not null default '[]'::jsonb check (jsonb_typeof(credits) = 'array'),
  trial_days       int not null default 14 check (trial_days between 0 and 90),
  sort             int not null default 0,
  active           boolean not null default true,
  -- продукт у Stripe: сервер створює його сам при першій оплаті тарифу
  stripe_product   text not null default '',
  created_at       timestamptz not null default now()
);

alter table public.billing_plans enable row level security;
drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans for select using (true);
drop policy if exists billing_plans_admin on public.billing_plans;
create policy billing_plans_admin on public.billing_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.billing_plans to anon, authenticated;
grant insert, update on public.billing_plans to authenticated;

-- Стартові тарифи. Це єдине місце, де вони задані; далі живуть лише в таблиці.
insert into public.billing_plans
  (id, audience, name, blurb, price_month_cents, price_year_cents, max_listings, max_developments, max_seats, credits, trial_days, sort)
values
  ('free', 'free', 'Free', 'Get started: a few listings and one project.', 0, 0, 10, 1, 2, '[]', 0, 0),
  ('agency_pro', 'agency', 'Pro', 'For a growing agency.', 4900, 49000, 60, 2, 6,
    '[{"product":"featured","kind":"listing","days":7,"count":1},{"product":"bump","kind":"listing","days":1,"count":4}]', 14, 10),
  ('agency_business', 'agency', 'Business', 'No limits, more promotion every month.', 12900, 129000, null, null, null,
    '[{"product":"featured","kind":"listing","days":7,"count":3},{"product":"bump","kind":"listing","days":1,"count":15}]', 14, 20),
  ('developer', 'developer', 'Developer', 'Up to three projects with unit grids and layouts.', 9900, 99000, 20, 3, 5,
    '[{"product":"featured","kind":"development","days":7,"count":1}]', 14, 30),
  ('developer_plus', 'developer', 'Developer Plus', 'Unlimited projects and a featured project all month.', 24900, 249000, null, null, null,
    '[{"product":"featured","kind":"development","days":30,"count":1},{"product":"homepage","kind":"listing","days":7,"count":1}]', 14, 40)
on conflict (id) do nothing;

/* ---------- налаштування (лише для функцій) ---------- */
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.billing_config (
  id         int primary key default 1 check (id = 1),
  -- false — ліміти не перевіряються (тарифи вже продаються, але нікого не блокують)
  enforce    boolean not null default false,
  -- скільки днів тариф ще діє, якщо Stripe не зміг списати гроші чи вебхук запізнився
  grace_days int not null default 7 check (grace_days between 0 and 30)
);
insert into private.billing_config (id) values (1) on conflict (id) do nothing;

/* ---------- підписки ---------- */
create table if not exists public.billing_subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  subject_kind         text not null check (subject_kind in ('agency', 'agent')),
  subject_id           uuid not null,
  plan_id              text not null references public.billing_plans(id),
  -- manual — тариф, виданий адміном до дати current_period_end
  billing_interval     text not null default 'month' check (billing_interval in ('month', 'year', 'manual')),
  -- статуси Stripe; manual-тарифи — завжди active
  status               text not null default 'incomplete' check (status in
    ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused')),
  stripe_customer      text not null default '',
  stripe_subscription  text unique,
  stripe_item          text not null default '',
  price_cents          int  not null default 0,
  currency             text not null default 'usd',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  trial_end            timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  manual               boolean not null default false,
  note                 text not null default '' check (length(note) <= 300),
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists billing_subscriptions_subject_idx
  on public.billing_subscriptions (subject_kind, subject_id, created_at desc);

/** Хто бачить тариф акаунта: члени агенції чи сам ріелтор; адмін — усіх. */
create or replace function public.billing_can_view(p_kind text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or case p_kind
    when 'agency' then exists (select 1 from public.agency_members m where m.agency_id = p_id and m.profile_id = auth.uid())
    when 'agent' then p_id = auth.uid()
    else false end
$$;

/** Хто платить і міняє тариф: власник агенції або сам незалежний ріелтор. */
create or replace function public.billing_can_manage(p_kind text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or case p_kind
    when 'agency' then public.is_agency_owner(p_id)
    when 'agent' then p_id = auth.uid()
    else false end
$$;

alter table public.billing_subscriptions enable row level security;
drop policy if exists billing_subscriptions_read on public.billing_subscriptions;
create policy billing_subscriptions_read on public.billing_subscriptions for select
  using (public.billing_can_view(subject_kind, subject_id));
-- писати напряму не можна: лише функції нижче
revoke insert, update, delete on public.billing_subscriptions from anon, authenticated;
grant select on public.billing_subscriptions to authenticated;

/* ---------- бонусні просування ---------- */
create table if not exists public.billing_credit_uses (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.billing_subscriptions(id) on delete cascade,
  campaign_id     uuid references public.promo_campaigns(id) on delete set null,
  product         text not null,
  target_kind     text not null,
  days            int  not null,
  used_by         uuid references public.profiles(id) on delete set null,
  used_at         timestamptz not null default now()
);
create index if not exists billing_credit_uses_sub_idx on public.billing_credit_uses (subscription_id, used_at desc);
alter table public.billing_credit_uses enable row level security;
drop policy if exists billing_credit_uses_read on public.billing_credit_uses;
create policy billing_credit_uses_read on public.billing_credit_uses for select
  using (exists (select 1 from public.billing_subscriptions s where s.id = subscription_id
    and public.billing_can_view(s.subject_kind, s.subject_id)));
revoke insert, update, delete on public.billing_credit_uses from anon, authenticated;
grant select on public.billing_credit_uses to authenticated;

-- кампанія з тарифу — окремий спосіб «оплати»
alter table public.promo_campaigns drop constraint if exists promo_campaigns_pay_method_check;
alter table public.promo_campaigns add constraint promo_campaigns_pay_method_check
  check (pay_method in ('', 'stripe', 'manual', 'plan'));

/* ---------- який тариф діє ---------- */

/**
 * Підписка, що діє зараз: Stripe — trialing/active/past_due до кінця періоду плюс
 * grace_days (на випадок збою оплати чи запізнілого вебхука); ручна — до своєї дати.
 * Якщо їх кілька, Stripe важливіша за ручну, новіша — за старішу.
 */
create or replace function public.billing_live_sub(p_kind text, p_id uuid)
returns public.billing_subscriptions language sql stable security definer set search_path = public as $$
  select s.* from public.billing_subscriptions s
  where s.subject_kind = p_kind and s.subject_id = p_id
    and case when s.manual
      then s.status = 'active' and coalesce(s.current_period_end, 'infinity'::timestamptz) > now()
      else s.status in ('trialing', 'active', 'past_due')
        and coalesce(s.current_period_end, 'infinity'::timestamptz)
          + make_interval(days => (select grace_days from private.billing_config where id = 1)) > now()
    end
  order by s.manual, s.created_at desc
  limit 1
$$;

create or replace function public.billing_plan_of(p_kind text, p_id uuid)
returns public.billing_plans language sql stable security definer set search_path = public as $$
  select p.* from public.billing_plans p
  where p.id = coalesce((public.billing_live_sub(p_kind, p_id)).plan_id, 'free')
$$;

/** Чий тариф рахується для обʼєкта: агенції, якщо він у команді, інакше ріелтора. */
create or replace function public.billing_subject(p_agency uuid, p_agent uuid, out kind text, out id uuid)
language sql immutable as $$
  select case when p_agency is not null then 'agency' else 'agent' end, coalesce(p_agency, p_agent)
$$;

/** Скільки зараз зайнято: опубліковані вторинні оголошення, ЖК, члени команди. */
create or replace function public.billing_usage(p_kind text, p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listings', (select count(*) from public.listings l where l.active and l.development_id is null
      and case when p_kind = 'agency' then l.agency_id = p_id else l.agent_id = p_id and l.agency_id is null end),
    'developments', (select count(*) from public.developments d where d.active
      and case when p_kind = 'agency' then d.agency_id = p_id else d.agent_id = p_id and d.agency_id is null end),
    'seats', case when p_kind = 'agency'
      then (select count(*) from public.agency_members m where m.agency_id = p_id) else 1 end
  )
$$;

/** Початок поточного «місяця» підписки — від дня старту, щоб і річний тариф давав бонуси щомісяця. */
create or replace function public.billing_month_start(p_start timestamptz)
returns timestamptz language sql stable as $$
  select case when p_start is null or p_start > now() then date_trunc('month', now())
    else p_start + make_interval(months => (extract(year from age(now(), p_start)) * 12
                                            + extract(month from age(now(), p_start)))::int) end
$$;

/** Бонуси тарифу і скільки з них уже взято цього місяця. */
create or replace function public.billing_credits_left(p_sub public.billing_subscriptions)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(c || jsonb_build_object('used', (
      select count(*) from public.billing_credit_uses u
      where u.subscription_id = p_sub.id and u.product = c->>'product' and u.target_kind = c->>'kind'
        and u.days = (c->>'days')::int
        and u.used_at >= public.billing_month_start(coalesce(p_sub.current_period_start, p_sub.created_at))
    ))), '[]'::jsonb)
  from public.billing_plans p, jsonb_array_elements(p.credits) c
  where p_sub.id is not null and p.id = p_sub.plan_id
$$;

/** Усе для вкладки Plan у кабінеті одним викликом. */
create or replace function public.billing_overview(p_kind text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_sub  public.billing_subscriptions;
  v_last public.billing_subscriptions;
begin
  if p_kind not in ('agency', 'agent') or not public.billing_can_view(p_kind, p_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  v_sub := public.billing_live_sub(p_kind, p_id);
  select * into v_last from public.billing_subscriptions
    where subject_kind = p_kind and subject_id = p_id and not manual order by created_at desc limit 1;
  return jsonb_build_object(
    'plan', to_jsonb(public.billing_plan_of(p_kind, p_id)) - 'stripe_product',
    'subscription', case when v_sub.id is null then null else to_jsonb(v_sub) end,
    'usage', public.billing_usage(p_kind, p_id),
    'credits', public.billing_credits_left(v_sub),
    'enforce', (select enforce from private.billing_config where id = 1),
    'canManage', public.billing_can_manage(p_kind, p_id),
    -- пробний період — лише раз на акаунт
    'hadTrial', exists (select 1 from public.billing_subscriptions
      where subject_kind = p_kind and subject_id = p_id and not manual and status <> 'incomplete_expired'),
    -- клієнт Stripe для порталу оплати й рахунків
    'customer', coalesce(v_last.stripe_customer, '')
  );
end $$;

/* ---------- запис підписки зі Stripe ---------- */

/**
 * Вебхук чи повернення з Checkout передають стан підписки зі Stripe. Сервер доводить,
 * що перевірив дані в Stripe, секретом private.promo_config. Повторний виклик безпечний.
 */
create or replace function public.billing_sync(
  p_secret text, p_kind text, p_id uuid, p_plan text, p_interval text, p_status text,
  p_customer text, p_subscription text, p_item text, p_price int, p_currency text,
  p_start timestamptz, p_end timestamptz, p_trial_end timestamptz, p_cancel_at_end boolean, p_canceled_at timestamptz)
returns public.billing_subscriptions language plpgsql security definer set search_path = public as $$
declare v_row public.billing_subscriptions;
begin
  if p_secret is null or p_secret <> (select secret from private.promo_config where id = 1) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('agency', 'agent') or p_id is null or coalesce(p_subscription, '') = '' then
    raise exception 'Bad subscription data' using errcode = '22023';
  end if;
  if not exists (select 1 from public.billing_plans where id = p_plan) then
    raise exception 'Unknown plan %', p_plan using errcode = '22023';
  end if;

  insert into public.billing_subscriptions as s (
    subject_kind, subject_id, plan_id, billing_interval, status, stripe_customer, stripe_subscription, stripe_item,
    price_cents, currency, current_period_start, current_period_end, trial_end, cancel_at_period_end, canceled_at)
  values (p_kind, p_id, p_plan, case when p_interval = 'year' then 'year' else 'month' end, p_status,
    coalesce(p_customer, ''), p_subscription, coalesce(p_item, ''), coalesce(p_price, 0), coalesce(p_currency, 'usd'),
    p_start, p_end, p_trial_end, coalesce(p_cancel_at_end, false), p_canceled_at)
  on conflict (stripe_subscription) do update set
    plan_id = excluded.plan_id, billing_interval = excluded.billing_interval, status = excluded.status,
    stripe_customer = excluded.stripe_customer, stripe_item = excluded.stripe_item,
    price_cents = excluded.price_cents, currency = excluded.currency,
    current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
    trial_end = excluded.trial_end, cancel_at_period_end = excluded.cancel_at_period_end,
    canceled_at = excluded.canceled_at, updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

/** Продукт Stripe для тарифу — сервер створює його раз і запамʼятовує. */
create or replace function public.billing_set_product(p_secret text, p_plan text, p_product text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and (p_secret is null or p_secret <> (select secret from private.promo_config where id = 1)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.billing_plans set stripe_product = left(coalesce(p_product, ''), 100) where id = p_plan;
end $$;

/* ---------- адмін ---------- */

/** Видати тариф вручну до дати (подарунок, оплата переказом). */
create or replace function public.billing_grant(p_kind text, p_id uuid, p_plan text, p_until timestamptz, p_note text default '')
returns public.billing_subscriptions language plpgsql security definer set search_path = public as $$
declare v_row public.billing_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_kind not in ('agency', 'agent') or p_until is null or p_until <= now() then
    raise exception 'Pick the account and an end date in the future' using errcode = '22023';
  end if;
  if p_kind = 'agency' and not exists (select 1 from public.agencies where id = p_id)
     or p_kind = 'agent' and not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.billing_plans where id = p_plan and id <> 'free') then
    raise exception 'Unknown plan' using errcode = '22023';
  end if;
  insert into public.billing_subscriptions (subject_kind, subject_id, plan_id, billing_interval, status, manual,
    current_period_start, current_period_end, note, created_by)
  values (p_kind, p_id, p_plan, 'manual', 'active', true, now(), p_until, left(coalesce(p_note, ''), 300), auth.uid())
  returning * into v_row;
  return v_row;
end $$;

/** Зняти ручний тариф одразу. */
create or replace function public.billing_revoke(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.billing_subscriptions set status = 'canceled', canceled_at = now(), updated_at = now()
    where id = p_id and manual;
end $$;

create or replace function public.billing_settings()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('enforce', enforce, 'graceDays', grace_days) from private.billing_config where id = 1
$$;

create or replace function public.billing_set_enforce(p_enforce boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update private.billing_config set enforce = coalesce(p_enforce, false) where id = 1;
end $$;

/* ---------- бонусне просування ---------- */

/**
 * Взяти бонус тарифу: кампанія за $0 на свій обʼєкт, активна одразу (або після
 * попередньої того самого виду). Брати може той, хто керує тарифом акаунта.
 */
create or replace function public.billing_use_credit(p_kind text, p_target uuid, p_product text, p_days int)
returns public.promo_campaigns language plpgsql security definer set search_path = public as $$
declare
  v_subj record;
  v_sub  public.billing_subscriptions;
  v_cred jsonb;
  v_row  public.promo_campaigns;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.promo_can_manage(p_kind, p_target) then
    raise exception 'You can only promote your own items' using errcode = '42501';
  end if;

  select s.kind, s.id into v_subj from (
    select (public.billing_subject(l.agency_id, l.agent_id)).* from public.listings l where p_kind = 'listing' and l.id = p_target
    union all
    select (public.billing_subject(d.agency_id, d.agent_id)).* from public.developments d where p_kind = 'development' and d.id = p_target
    union all
    select (public.billing_subject(d.agency_id, d.agent_id)).* from public.buildings b
      join public.developments d on d.id = b.development_id where p_kind = 'building' and b.id = p_target
    union all
    select 'agency', p_target where p_kind = 'agency'
  ) s limit 1;
  if v_subj.id is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  if not public.billing_can_manage(v_subj.kind, v_subj.id) then
    raise exception 'Only the account owner can use plan promotions' using errcode = '42501';
  end if;

  v_sub := public.billing_live_sub(v_subj.kind, v_subj.id);
  if v_sub.id is null then raise exception 'Your plan has no included promotions' using errcode = '22023'; end if;

  -- блокуємо підписку, щоб два кліки не взяли один бонус двічі
  perform 1 from public.billing_subscriptions where id = v_sub.id for update;
  select c into v_cred from jsonb_array_elements(public.billing_credits_left(v_sub)) c
    where c->>'product' = p_product and c->>'kind' = p_kind and (c->>'days')::int = p_days limit 1;
  if v_cred is null then raise exception 'Your plan does not include this promotion' using errcode = '22023'; end if;
  if (v_cred->>'used')::int >= (v_cred->>'count')::int then
    raise exception 'You have used this month''s included promotions' using errcode = '22023';
  end if;

  insert into public.promo_campaigns (owner_id, target_kind, target_id, target_name, product, days, price_cents, currency)
  values (auth.uid(), p_kind, p_target, public.promo_target_name(p_kind, p_target), p_product, p_days, 0, v_sub.currency)
  returning * into v_row;
  v_row := public.promo_activate(v_row.id, 'manual', 'plan:' || v_sub.id::text,
    (select secret from private.promo_config where id = 1));
  update public.promo_campaigns set pay_method = 'plan' where id = v_row.id returning * into v_row;

  insert into public.billing_credit_uses (subscription_id, campaign_id, product, target_kind, days, used_by)
  values (v_sub.id, v_row.id, p_product, p_kind, p_days, auth.uid());
  return v_row;
end $$;

/* ---------- ліміти ---------- */

create or replace function public.billing_limit_error(p_plan public.billing_plans, p_what text, p_max int)
returns void language plpgsql as $$
begin
  raise exception 'Your % plan allows % %. Upgrade on the Plan tab or unpublish one first.', p_plan.name, p_max, p_what
    using errcode = 'P0001', hint = 'plan_limit';
end $$;

-- Вторинне оголошення публікується (нове, знову ввімкнене, перенесене в іншу команду).
-- Системні виклики (cron, без користувача) і адмін ліміт не перевіряють.
create or replace function public.billing_check_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_subj record;
  v_plan public.billing_plans;
  v_used int;
begin
  if not new.active or new.development_id is not null then return new; end if;
  if tg_op = 'UPDATE' and old.active and old.development_id is null
     and old.agency_id is not distinct from new.agency_id and old.agent_id = new.agent_id then
    return new;
  end if;
  if auth.uid() is null or public.is_admin()
     or not (select enforce from private.billing_config where id = 1) then
    return new;
  end if;
  select * into v_subj from public.billing_subject(new.agency_id, new.agent_id);
  v_plan := public.billing_plan_of(v_subj.kind, v_subj.id);
  if v_plan.max_listings is null then return new; end if;
  select count(*) into v_used from public.listings l
    where l.active and l.development_id is null and l.id <> new.id
      and case when v_subj.kind = 'agency' then l.agency_id = v_subj.id else l.agent_id = v_subj.id and l.agency_id is null end;
  if v_used >= v_plan.max_listings then
    perform public.billing_limit_error(v_plan, 'published listings', v_plan.max_listings);
  end if;
  return new;
end $$;

drop trigger if exists billing_check_listing on public.listings;
create trigger billing_check_listing before insert or update of active, agency_id, agent_id, development_id
  on public.listings for each row execute function public.billing_check_listing();

create or replace function public.billing_check_development()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_subj record;
  v_plan public.billing_plans;
  v_used int;
begin
  if not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.active
     and old.agency_id is not distinct from new.agency_id and old.agent_id = new.agent_id then
    return new;
  end if;
  if auth.uid() is null or public.is_admin()
     or not (select enforce from private.billing_config where id = 1) then
    return new;
  end if;
  select * into v_subj from public.billing_subject(new.agency_id, new.agent_id);
  v_plan := public.billing_plan_of(v_subj.kind, v_subj.id);
  if v_plan.max_developments is null then return new; end if;
  select count(*) into v_used from public.developments d
    where d.active and d.id <> new.id
      and case when v_subj.kind = 'agency' then d.agency_id = v_subj.id else d.agent_id = v_subj.id and d.agency_id is null end;
  if v_used >= v_plan.max_developments then
    perform public.billing_limit_error(v_plan, 'published projects', v_plan.max_developments);
  end if;
  return new;
end $$;

drop trigger if exists billing_check_development on public.developments;
create trigger billing_check_development before insert or update of active, agency_id, agent_id
  on public.developments for each row execute function public.billing_check_development();

create or replace function public.billing_check_seat()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan public.billing_plans;
  v_used int;
begin
  if auth.uid() is null or public.is_admin()
     or not (select enforce from private.billing_config where id = 1) then
    return new;
  end if;
  v_plan := public.billing_plan_of('agency', new.agency_id);
  if v_plan.max_seats is null then return new; end if;
  select count(*) into v_used from public.agency_members where agency_id = new.agency_id;
  if v_used >= v_plan.max_seats then
    raise exception 'This team''s % plan allows % people. The owner can upgrade on the Plan tab.', v_plan.name, v_plan.max_seats
      using errcode = 'P0001', hint = 'plan_limit';
  end if;
  return new;
end $$;

drop trigger if exists billing_check_seat on public.agency_members;
create trigger billing_check_seat before insert on public.agency_members
  for each row execute function public.billing_check_seat();

/* ---------- права на функції ---------- */
revoke all on function public.billing_live_sub(text, uuid) from public;
revoke all on function public.billing_plan_of(text, uuid) from public;
revoke all on function public.billing_usage(text, uuid) from public;
revoke all on function public.billing_credits_left(public.billing_subscriptions) from public;
revoke all on function public.billing_check_listing() from public;
revoke all on function public.billing_check_development() from public;
revoke all on function public.billing_check_seat() from public;
revoke all on function public.billing_overview(text, uuid) from public;
revoke all on function public.billing_sync(text, text, uuid, text, text, text, text, text, text, int, text, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.billing_set_product(text, text, text) from public;
revoke all on function public.billing_grant(text, uuid, text, timestamptz, text) from public;
revoke all on function public.billing_revoke(uuid) from public;
revoke all on function public.billing_settings() from public;
revoke all on function public.billing_set_enforce(boolean) from public;
revoke all on function public.billing_use_credit(text, uuid, text, int) from public;

grant execute on function public.billing_can_view(text, uuid) to authenticated;
grant execute on function public.billing_can_manage(text, uuid) to authenticated;
grant execute on function public.billing_overview(text, uuid) to authenticated;
-- із секретом: сервер ходить із ключем anon (вебхук без сесії) або від імені користувача
grant execute on function public.billing_sync(text, text, uuid, text, text, text, text, text, text, int, text, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to anon, authenticated;
grant execute on function public.billing_set_product(text, text, text) to anon, authenticated;
grant execute on function public.billing_grant(text, uuid, text, timestamptz, text) to authenticated;
grant execute on function public.billing_revoke(uuid) to authenticated;
grant execute on function public.billing_settings() to authenticated;
grant execute on function public.billing_set_enforce(boolean) to authenticated;
grant execute on function public.billing_use_credit(text, uuid, text, int) to authenticated;
