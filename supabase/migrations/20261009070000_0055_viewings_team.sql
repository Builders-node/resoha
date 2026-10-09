-- Візити у відділ продажів і ролі в команді.
--  1. Місткість слота й неробочі дні ЖК; запис на візит (visit_bookings) з токеном для скасування
--     й перенесення за посиланням, статуси «прийшов» / «не прийшов», нагадування за 24 год і за 1 год.
--  2. Ролі в агенції: owner / manager / editor / leads (і звичайний agent — лише своє).
--     Права по всій агенції: оголошення й ЖК — owner, manager, editor; заявки — owner, manager, leads;
--     команда — owner, manager.
--  3. Запрошення в агенцію листом із посиланням (agency_invites) замість коду, який передають вручну.
-- Листи йдуть через чергу notify_outbox (0050). Політики міняємо лише через ALTER POLICY.

create schema if not exists private;

/* =====================================================================
   1. Візити
   ===================================================================== */

-- Скільки візитів приймає відділ продажів в один слот і в які дні він зачинений (свята)
alter table public.developments
  add column if not exists visit_capacity int not null default 1,
  add column if not exists blackout_dates date[] not null default '{}';
alter table public.developments drop constraint if exists developments_visit_capacity;
alter table public.developments add constraint developments_visit_capacity check (visit_capacity between 1 and 20);
alter table public.developments drop constraint if exists developments_blackout_len;
alter table public.developments add constraint developments_blackout_len check (cardinality(blackout_dates) <= 120);

create index if not exists leads_visit_at_idx on public.leads (visit_at) where channel = 'visit';

-- Запис на візит: окремо від заявки, щоб не заважати воронці заявок. Токен — для посилання з листа.
create table if not exists public.visit_bookings (
  lead_id          uuid primary key references public.leads(id) on delete cascade,
  development_id   uuid references public.developments(id) on delete set null,
  token            text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  status           text not null default 'booked',
  cancelled_by     text not null default '',
  reschedules      int not null default 0,
  reminded_24h_at  timestamptz,
  reminded_1h_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.visit_bookings drop constraint if exists visit_bookings_status;
alter table public.visit_bookings add constraint visit_bookings_status
  check (status in ('booked', 'cancelled', 'attended', 'no_show'));
alter table public.visit_bookings drop constraint if exists visit_bookings_cancelled_by;
alter table public.visit_bookings add constraint visit_bookings_cancelled_by check (cancelled_by in ('', 'buyer', 'team'));
create unique index if not exists visit_bookings_token on public.visit_bookings (token);
create index if not exists visit_bookings_dev_idx on public.visit_bookings (development_id);

-- Бачить запис той, хто бачить саму заявку (політики leads); пишуть лише функції нижче
alter table public.visit_bookings enable row level security;
do $$ begin
  create policy visit_bookings_read on public.visit_bookings for select
    using (exists (select 1 from public.leads l where l.id = visit_bookings.lead_id));
exception when duplicate_object then null; end $$;
revoke all on public.visit_bookings from anon, authenticated;
grant select (lead_id, development_id, status, cancelled_by, reschedules, reminded_24h_at, reminded_1h_at, created_at, updated_at)
  on public.visit_bookings to authenticated;

-- Майбутні візити, записані до цієї міграції
insert into public.visit_bookings (lead_id, development_id, reminded_24h_at)
select l.id, li.development_id, l.reminded_at
from public.leads l join public.listings li on li.id = l.listing_id
where l.channel = 'visit' and l.visit_at > now()
on conflict (lead_id) do nothing;

/**
 * Чи можна записати візит на цей момент: день не вихідний за списком свят і в слоті є місце.
 * Місткість рахуємо по всьому ЖК (один відділ продажів на всі квартири). Блокування —
 * щоб два одночасні записи не зайняли останнє місце обидва.
 */
create or replace function private.visit_check(p_listing uuid, p_at timestamptz, p_exclude uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_dev uuid; v_cap int; v_off date[]; v_n int;
begin
  select l.development_id, coalesce(d.visit_capacity, 1), coalesce(d.blackout_dates, '{}')
    into v_dev, v_cap, v_off
  from public.listings l left join public.developments d on d.id = l.development_id
  where l.id = p_listing;

  perform pg_advisory_xact_lock(hashtext('visit:' || coalesce(v_dev, p_listing)::text));

  if (p_at at time zone 'America/Tegucigalpa')::date = any (v_off) then
    raise exception 'The sales office is closed on this day. Please pick another one.';
  end if;

  select count(*) into v_n
  from public.leads x
  join public.listings xl on xl.id = x.listing_id
  left join public.visit_bookings b on b.lead_id = x.id
  where x.channel = 'visit' and x.visit_at = p_at
    and (p_exclude is null or x.id <> p_exclude)
    and coalesce(b.status, 'booked') <> 'cancelled'
    and (case when v_dev is not null then xl.development_id = v_dev else x.listing_id = p_listing end);
  if v_n >= v_cap then
    raise exception 'This time is no longer available. Please pick another one.';
  end if;
end $$;
revoke all on function private.visit_check(uuid, timestamptz, uuid) from public, anon, authenticated;

-- Перед вставкою заявки-візиту (після leads_guard, який уже перевірив межі часу)
create or replace function public.leads_visit_slot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.channel = 'visit' and new.visit_at is not null then
    perform private.visit_check(new.listing_id, new.visit_at, null);
  end if;
  return new;
end $$;
revoke all on function public.leads_visit_slot() from public, anon, authenticated;
create or replace trigger leads_visit_slot before insert on public.leads
  for each row execute function public.leads_visit_slot();

-- Після вставки: запис із токеном. Тригер іде після leads_notify (за абеткою), тож лист-підтвердження
-- покупцю вже в черзі — дописуємо в нього токен, щоб у листі було посилання «змінити чи скасувати».
create or replace function public.leads_visit_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if new.channel <> 'visit' or new.visit_at is null then return new; end if;
  insert into public.visit_bookings (lead_id, development_id)
  values (new.id, (select development_id from public.listings where id = new.listing_id))
  on conflict (lead_id) do nothing
  returning token into v_token;
  if v_token is not null then
    update public.notify_outbox set payload = payload || jsonb_build_object('manageToken', v_token)
    where kind = 'lead_receipt' and sent_at is null and payload->>'id' = new.id::text;
  end if;
  return new;
exception when others then
  raise warning 'leads_visit_booking: %', sqlerrm;
  return new;
end $$;
revoke all on function public.leads_visit_booking() from public, anon, authenticated;
create or replace trigger leads_visit_booking after insert on public.leads
  for each row execute function public.leads_visit_booking();

/** Зайняті слоти ЖК на найближчі 90 днів — для календаря запису. Лише час і кількість, без імен. */
create or replace function public.visit_busy(p_development uuid)
returns table (visit_at timestamptz, booked int)
language sql stable security definer set search_path = public as $$
  select x.visit_at, count(*)::int
  from public.leads x
  join public.listings xl on xl.id = x.listing_id
  left join public.visit_bookings b on b.lead_id = x.id
  where xl.development_id = p_development and x.channel = 'visit'
    and x.visit_at > now() and x.visit_at < now() + interval '91 days'
    and coalesce(b.status, 'booked') <> 'cancelled'
  group by x.visit_at
$$;
revoke all on function public.visit_busy(uuid) from public;
grant execute on function public.visit_busy(uuid) to anon, authenticated;

/** Картка запису за токеном: що, коли, де — для сторінки /visit/<token>. */
create or replace function public.visit_lookup(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'leadId', l.id, 'status', b.status, 'cancelledBy', b.cancelled_by, 'visitAt', l.visit_at,
    'name', l.name, 'listing', private.listing_card(l.listing_id),
    'development', case when d.id is null then null else jsonb_build_object(
      'id', d.id, 'name', d.name, 'slug', d.slug, 'schedule', d.schedule, 'capacity', d.visit_capacity,
      'blackout', to_jsonb(d.blackout_dates), 'office', d.office, 'address', d.address,
      'neighborhood', d.neighborhood, 'hours', d.hours) end,
    'agent', (select jsonb_build_object('name', p.name, 'phone', p.phone, 'whatsapp', p.whatsapp)
              from public.profiles p where p.id = l.agent_id))
  from public.visit_bookings b
  join public.leads l on l.id = b.lead_id
  left join public.listings li on li.id = l.listing_id
  left join public.developments d on d.id = li.development_id
  where p_token is not null and length(p_token) >= 32 and b.token = p_token
$$;
revoke all on function public.visit_lookup(text) from public;
grant execute on function public.visit_lookup(text) to anon, authenticated;

/** Сповістити ріелтора й покупця про зміну візиту (через чергу) */
create or replace function private.visit_notify(p_lead uuid, p_event text, p_old timestamptz, p_to_agent boolean, p_to_buyer boolean)
returns void language plpgsql security definer set search_path = public as $$
declare l record; v_token text;
begin
  select * into l from public.leads where id = p_lead;
  if not found then return; end if;
  select token into v_token from public.visit_bookings where lead_id = p_lead;
  if p_to_agent then
    insert into public.notify_outbox (kind, user_id, payload) values ('visit_reminder_agent', l.agent_id,
      jsonb_build_object('event', p_event, 'name', l.name, 'phone', l.phone, 'visitAt', l.visit_at,
        'oldVisitAt', p_old, 'listing', private.listing_card(l.listing_id)));
  end if;
  if p_to_buyer and coalesce(l.email, '') <> '' then
    insert into public.notify_outbox (kind, email, payload) values ('visit_reminder', l.email,
      jsonb_build_object('event', p_event, 'name', l.name, 'visitAt', l.visit_at, 'oldVisitAt', p_old,
        'manageToken', v_token, 'listing', private.listing_card(l.listing_id)));
  end if;
end $$;
revoke all on function private.visit_notify(uuid, text, timestamptz, boolean, boolean) from public, anon, authenticated;

/**
 * Покупець за посиланням з листа скасовує або переносить візит. Слот за графіком перевіряє API
 * (як і при записі); тут — межі часу, свята й місткість, яких не обійти прямим викликом.
 */
create or replace function public.visit_manage(p_token text, p_action text, p_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.visit_bookings; l public.leads; v_old timestamptz;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'Booking not found'; end if;
  select * into b from public.visit_bookings where token = p_token for update;
  if not found then raise exception 'Booking not found'; end if;
  select * into l from public.leads where id = b.lead_id;
  if b.status <> 'booked' then raise exception 'This visit can no longer be changed'; end if;
  if l.visit_at < now() then raise exception 'This visit has already passed'; end if;
  v_old := l.visit_at;

  if p_action = 'cancel' then
    update public.visit_bookings set status = 'cancelled', cancelled_by = 'buyer', updated_at = now()
    where lead_id = b.lead_id;
    perform private.visit_notify(b.lead_id, 'cancelled', v_old, true, true);
  elsif p_action = 'reschedule' then
    if b.reschedules >= 5 then raise exception 'This visit was moved too many times. Please contact the sales office.'; end if;
    if p_at is null or p_at < now() + interval '1 hour' or p_at > now() + interval '90 days' then
      raise exception 'Pick a visit time from the schedule';
    end if;
    perform private.visit_check(l.listing_id, p_at, l.id);
    update public.leads set visit_at = p_at where id = l.id;
    update public.visit_bookings set reschedules = reschedules + 1, reminded_24h_at = null, reminded_1h_at = null,
      updated_at = now() where lead_id = b.lead_id;
    perform private.visit_notify(b.lead_id, 'rescheduled', v_old, true, true);
  else
    raise exception 'Unknown action';
  end if;
  return public.visit_lookup(p_token);
end $$;
revoke all on function public.visit_manage(text, text, timestamptz) from public;
grant execute on function public.visit_manage(text, text, timestamptz) to anon, authenticated;

/* ---------- ролі (потрібні вже тут — для visit_set_status) ---------- */
alter table public.agency_members add column if not exists role text not null default 'agent';
alter table public.agency_members drop constraint if exists agency_members_role;
alter table public.agency_members add constraint agency_members_role
  check (role in ('owner', 'manager', 'editor', 'leads', 'agent'));

/**
 * Що може викликач в агенції a: 'listings' — оголошення й ЖК усієї команди, 'leads' — усі заявки,
 * 'team' — склад команди й запрошення. Власник може все.
 */
create or replace function public.agency_can(a uuid, what text)
returns boolean language sql security definer stable set search_path = public as $$
  select a is not null and exists (
    select 1 from public.agency_members m
    where m.agency_id = a and m.profile_id = auth.uid()
      and (m.is_owner or m.role = any (case what
        when 'listings' then array['manager', 'editor']
        when 'leads'    then array['manager', 'leads']
        when 'team'     then array['manager']
        else array[]::text[] end))
  );
$$;
revoke all on function public.agency_can(uuid, text) from public;
grant execute on function public.agency_can(uuid, text) to anon, authenticated;

/** Команда відмічає візит: прийшов, не прийшов, скасовано; або повертає в «записаний». */
create or replace function public.visit_set_status(p_lead uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.leads; v_prev text;
begin
  select * into l from public.leads where id = p_lead;
  if not found or l.channel <> 'visit' or not (
    l.agent_id = auth.uid() or public.agency_can(l.agency_id, 'leads') or public.is_admin()
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status not in ('booked', 'cancelled', 'attended', 'no_show') then raise exception 'Unknown status'; end if;

  insert into public.visit_bookings (lead_id, development_id)
  values (l.id, (select development_id from public.listings where id = l.listing_id))
  on conflict (lead_id) do nothing;
  select status into v_prev from public.visit_bookings where lead_id = p_lead;
  if v_prev = p_status then return; end if;

  if p_status = 'booked' and l.visit_at > now() then
    perform private.visit_check(l.listing_id, l.visit_at, l.id);
  end if;
  update public.visit_bookings set status = p_status, updated_at = now(),
    cancelled_by = case when p_status = 'cancelled' then 'team' else '' end
  where lead_id = p_lead;
  -- скасування командою — покупцю лист, щоб не їхав даремно
  if p_status = 'cancelled' and l.visit_at > now() then
    perform private.visit_notify(p_lead, 'cancelled_by_team', l.visit_at, false, true);
  end if;
end $$;
revoke all on function public.visit_set_status(uuid, text) from public, anon;
grant execute on function public.visit_set_status(uuid, text) to authenticated;

/* ---------- нагадування: за 24 год і за 1 год ---------- */
create or replace function public.notify_schedule()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  -- за добу (у вікні від 2 до 25 годин: запис, зроблений менш ніж за добу, теж отримає нагадування)
  with due as (
    update public.visit_bookings b set reminded_24h_at = now()
    from public.leads l
    where l.id = b.lead_id and b.status = 'booked' and b.reminded_24h_at is null
      and l.visit_at between now() + interval '2 hours' and now() + interval '25 hours'
    returning l.*, b.token
  ), agent as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'visit_reminder_agent', d.agent_id, jsonb_build_object('event', '24h', 'name', d.name, 'phone', d.phone,
      'visitAt', d.visit_at, 'listing', private.listing_card(d.listing_id)) from due d
    returning 1
  ), buyer as (
    insert into public.notify_outbox (kind, email, payload)
    select 'visit_reminder', d.email, jsonb_build_object('event', '24h', 'name', d.name, 'visitAt', d.visit_at,
      'manageToken', d.token, 'listing', private.listing_card(d.listing_id)) from due d where coalesce(d.email, '') <> ''
    returning 1
  )
  select (select count(*) from agent) + (select count(*) from buyer) into k;
  n := n + k;

  -- за годину (cron ходить раз на 5 хвилин, тож вікно трохи ширше)
  with due as (
    update public.visit_bookings b set reminded_1h_at = now(), reminded_24h_at = coalesce(b.reminded_24h_at, now())
    from public.leads l
    where l.id = b.lead_id and b.status = 'booked' and b.reminded_1h_at is null
      and l.visit_at between now() + interval '15 minutes' and now() + interval '75 minutes'
    returning l.*, b.token
  ), agent as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'visit_reminder_agent', d.agent_id, jsonb_build_object('event', '1h', 'name', d.name, 'phone', d.phone,
      'visitAt', d.visit_at, 'listing', private.listing_card(d.listing_id)) from due d
    returning 1
  ), buyer as (
    insert into public.notify_outbox (kind, email, payload)
    select 'visit_reminder', d.email, jsonb_build_object('event', '1h', 'name', d.name, 'visitAt', d.visit_at,
      'manageToken', d.token, 'listing', private.listing_card(d.listing_id)) from due d where coalesce(d.email, '') <> ''
    returning 1
  )
  select (select count(*) from agent) + (select count(*) from buyer) into k;
  n := n + k;

  -- строк показу спливає за 7 днів (як у 0050)
  with due as (
    update public.listings set expiry_notified_at = now()
    where expiry_notified_at is null and review = 'approved' and active
      and expires_at between now() and now() + interval '7 days'
    returning id, agent_id, expires_at
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'expiring', d.agent_id, private.listing_card(d.id) || jsonb_build_object('expiresAt', d.expires_at)
    from due d returning 1
  )
  select count(*) into k from ins;
  n := n + k;
  return n;
end $$;
revoke all on function public.notify_schedule() from public, anon, authenticated;

/* =====================================================================
   2. Ролі в команді
   ===================================================================== */

update public.agency_members set role = 'owner' where is_owner and role <> 'owner';

-- is_owner і role — одне й те саме для власника: хто б що не змінив, друге підтягуємо
create or replace function public.agency_members_role()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.is_owner then new.role := 'owner';
    elsif new.role = 'owner' then new.is_owner := true;
    end if;
  elsif new.role is distinct from old.role then
    new.is_owner := new.role = 'owner';
  elsif new.is_owner is distinct from old.is_owner then
    new.role := case when new.is_owner then 'owner' else 'agent' end;
  end if;
  return new;
end $$;
revoke all on function public.agency_members_role() from public, anon, authenticated;
create or replace trigger agency_members_role before insert or update on public.agency_members
  for each row execute function public.agency_members_role();

-- Роль в активній команді — дзеркало в профілі, як agency_id / is_owner. Рахується завжди з членства,
-- тож прямим записом у профіль собі роль не підняти.
alter table public.profiles add column if not exists agency_role text;

create or replace function public.profiles_agency_role()
returns trigger language plpgsql set search_path = public as $$
begin
  new.agency_role := case when new.agency_id is null then null else coalesce(
    (select m.role from public.agency_members m where m.agency_id = new.agency_id and m.profile_id = new.id),
    case when new.is_owner then 'owner' else 'agent' end) end;
  return new;
end $$;
revoke all on function public.profiles_agency_role() from public, anon, authenticated;
create or replace trigger profiles_agency_role before insert or update on public.profiles
  for each row execute function public.profiles_agency_role();

update public.profiles set agency_role = null where agency_id is not null;

-- Керує людиною: власник спільної команди — будь-ким, менеджер — усіма, крім власників
create or replace function public.manages_member(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.agency_members me
    join public.agency_members m on m.agency_id = me.agency_id
    where me.profile_id = auth.uid() and m.profile_id = p
      and (me.is_owner or (me.role = 'manager' and not m.is_owner))
  );
$$;

-- Код запрошення бачать і змінюють власник і менеджер
create or replace function public.agency_invite_code()
returns text language plpgsql security definer stable set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.agency_can(me.agency_id, 'team') then
    raise exception 'Only the agency owner or a manager can see the invite code';
  end if;
  return (select invite_code from public.agencies where id = me.agency_id);
end $$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare me public.profiles; code text;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.agency_can(me.agency_id, 'team') then
    raise exception 'Only the agency owner or a manager can do this';
  end if;
  code := public.gen_invite_code();
  update public.agencies set invite_code = code where id = me.agency_id;
  return code;
end $$;

/**
 * Змінити роль колеги в активній команді. Менеджер не чіпає власників і не робить власником;
 * в агенції завжди лишається хоч один власник.
 */
create or replace function public.set_member_role(p_member uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare me public.profiles; m public.agency_members;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.agency_can(me.agency_id, 'team') then
    raise exception 'Only the agency owner or a manager can do this';
  end if;
  if p_role not in ('owner', 'manager', 'editor', 'leads', 'agent') then raise exception 'Unknown role'; end if;
  select * into m from public.agency_members where agency_id = me.agency_id and profile_id = p_member;
  if not found then raise exception 'Not a member of your agency'; end if;
  if (m.is_owner or p_role = 'owner') and not public.is_agency_owner(me.agency_id) then
    raise exception 'Only an owner can change owners';
  end if;
  if m.is_owner and p_role <> 'owner' and not exists (
    select 1 from public.agency_members where agency_id = me.agency_id and is_owner and profile_id <> p_member
  ) then
    raise exception 'The agency needs at least one owner';
  end if;

  update public.agency_members set role = p_role where agency_id = me.agency_id and profile_id = p_member;
  -- дзеркало в профілі (тригер profiles_agency_role перерахує)
  update public.profiles set agency_role = null where id = p_member;
  return p_role;
end $$;
revoke all on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

/* ---------- RLS: оголошення, ЖК та агенція ---------- */
alter policy listings_read on public.listings using (
  (active and review = 'approved' and (expires_at is null or expires_at > now())
    and exists (select 1 from public.profiles p where p.id = listings.agent_id and p.active))
  or agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin()
);
alter policy listings_update on public.listings
  using (agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin())
  with check (agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin());

alter policy land_facts_write on public.land_facts
  using (exists (select 1 from public.listings l where l.id = listing_id
                 and (l.agent_id = (select auth.uid()) or public.agency_can(l.agency_id, 'listings') or public.is_admin())))
  with check (exists (select 1 from public.listings l where l.id = listing_id
                 and (l.agent_id = (select auth.uid()) or public.agency_can(l.agency_id, 'listings') or public.is_admin())));

alter policy listing_events_read on public.listing_events using (
  agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin()
);

alter policy developments_read on public.developments using (
  (active and exists (select 1 from public.profiles p where p.id = developments.agent_id and p.active))
  or agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin()
);
alter policy developments_update on public.developments
  using (agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin())
  with check (agent_id = (select auth.uid()) or public.agency_can(agency_id, 'listings') or public.is_admin());

alter policy buildings_write on public.buildings
  using (exists (select 1 from public.developments d where d.id = buildings.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = buildings.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())));

alter policy development_documents_write on public.development_documents
  using (exists (select 1 from public.developments d where d.id = development_documents.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_documents.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())));

alter policy development_progress_write on public.development_progress
  using (exists (select 1 from public.developments d where d.id = development_progress.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_progress.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())));

alter policy development_news_write on public.development_news
  using (exists (select 1 from public.developments d where d.id = development_news.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_news.development_id
    and (d.agent_id = (select auth.uid()) or public.agency_can(d.agency_id, 'listings') or public.is_admin())));

-- картку агенції редагують власник і менеджер
alter policy agencies_update on public.agencies
  using (public.agency_can(id, 'team') or public.is_admin())
  with check (public.agency_can(id, 'team') or public.is_admin());

/* =====================================================================
   3. Запрошення листом
   ===================================================================== */
create table if not exists public.agency_invites (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  email        text not null,
  role         text not null default 'agent',
  token        text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invited_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id) on delete set null,
  revoked_at   timestamptz
);
alter table public.agency_invites drop constraint if exists agency_invites_role;
alter table public.agency_invites add constraint agency_invites_role
  check (role in ('owner', 'manager', 'editor', 'leads', 'agent'));
create unique index if not exists agency_invites_token on public.agency_invites (token);
create index if not exists agency_invites_agency_idx on public.agency_invites (agency_id, created_at desc);

alter table public.agency_invites enable row level security;
do $$ begin
  create policy agency_invites_read on public.agency_invites for select using (public.agency_can(agency_id, 'team'));
exception when duplicate_object then null; end $$;
revoke all on public.agency_invites from anon, authenticated;
grant select on public.agency_invites to authenticated;

/** Надіслати запрошення: рядок + лист у черзі. Повторне запрошення на ту саму адресу замінює старе. */
create or replace function public.invite_member(p_email text, p_role text default 'agent')
returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.profiles; ag public.agencies; v_email text := lower(trim(coalesce(p_email, ''))); inv public.agency_invites;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.agency_can(me.agency_id, 'team') then
    raise exception 'Only the agency owner or a manager can invite';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'Enter a valid email'; end if;
  if coalesce(p_role, '') not in ('owner', 'manager', 'editor', 'leads', 'agent') then raise exception 'Unknown role'; end if;
  if p_role = 'owner' and not public.is_agency_owner(me.agency_id) then
    raise exception 'Only an owner can invite another owner';
  end if;
  if exists (select 1 from public.agency_members m join public.profiles p on p.id = m.profile_id
             where m.agency_id = me.agency_id and lower(p.email) = v_email) then
    raise exception 'This person is already in your team';
  end if;
  if (select count(*) from public.agency_invites where agency_id = me.agency_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Too many invitations today. Please try again tomorrow.';
  end if;

  select * into ag from public.agencies where id = me.agency_id;
  update public.agency_invites set revoked_at = now()
  where agency_id = me.agency_id and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.agency_invites (agency_id, email, role, invited_by)
  values (me.agency_id, v_email, p_role, me.id) returning * into inv;

  insert into public.notify_outbox (kind, email, payload) values ('agency_invite', v_email, jsonb_build_object(
    'agency', ag.name, 'brand', ag.brand, 'inviter', me.name, 'role', inv.role,
    'token', inv.token, 'expiresAt', inv.expires_at));

  return jsonb_build_object('id', inv.id, 'email', inv.email, 'role', inv.role,
    'token', inv.token, 'createdAt', inv.created_at, 'expiresAt', inv.expires_at);
end $$;
revoke all on function public.invite_member(text, text) from public, anon;
grant execute on function public.invite_member(text, text) to authenticated;

create or replace function public.revoke_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.agency_invites set revoked_at = now()
  where id = p_id and accepted_at is null and revoked_at is null and public.agency_can(agency_id, 'team');
  if not found then raise exception 'Invitation not found'; end if;
end $$;
revoke all on function public.revoke_invite(uuid) from public, anon;
grant execute on function public.revoke_invite(uuid) to authenticated;

/** Що за запрошення — для сторінки /invite/<token>, видно й без входу. */
create or replace function public.invite_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'agency', jsonb_build_object('id', a.id, 'name', a.name, 'brand', a.brand),
    'role', i.role, 'email', i.email,
    'inviter', coalesce((select name from public.profiles where id = i.invited_by), ''),
    'status', case when i.accepted_at is not null then 'accepted' when i.revoked_at is not null then 'revoked'
                   when i.expires_at < now() then 'expired' else 'pending' end)
  from public.agency_invites i join public.agencies a on a.id = i.agency_id
  where p_token is not null and length(p_token) >= 32 and i.token = p_token
$$;
revoke all on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;

/** Прийняти запрошення: членство з роллю із запрошення, команда стає активною в кабінеті. */
create or replace function public.accept_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.agency_invites; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then raise exception 'Sign in to accept the invitation'; end if;
  if me.role <> 'agent' then raise exception 'Only agent accounts can join an agency'; end if;
  select * into inv from public.agency_invites where token = p_token and length(coalesce(p_token, '')) >= 32 for update;
  if not found or inv.revoked_at is not null then raise exception 'Invitation not found'; end if;
  if inv.accepted_at is not null then raise exception 'This invitation has already been used'; end if;
  if inv.expires_at < now() then raise exception 'This invitation has expired. Ask for a new one.'; end if;
  if exists (select 1 from public.agency_members where agency_id = inv.agency_id and profile_id = me.id) then
    raise exception 'You are already in this agency';
  end if;

  insert into public.agency_members (agency_id, profile_id, is_owner, role)
  values (inv.agency_id, me.id, inv.role = 'owner', inv.role);
  update public.profiles set agency_id = inv.agency_id, is_owner = inv.role = 'owner' where id = me.id;
  update public.agency_invites set accepted_at = now(), accepted_by = me.id where id = inv.id;

  select * into a from public.agencies where id = inv.agency_id;
  return jsonb_build_object(
    'id', a.id, 'name', a.name, 'brand', a.brand, 'phone', a.phone,
    'email', a.email, 'about', a.about, 'verified', a.verified,
    'owner_id', a.owner_id, 'created_at', a.created_at);
end $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
