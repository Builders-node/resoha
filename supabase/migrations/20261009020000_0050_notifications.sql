-- Сповіщення: черга листів і повідомлень у Telegram. Події кладуть рядки в чергу тригерами,
-- а відправляє застосунок (/api/cron/notify) — він знає шаблони й ключі поштового сервісу.
-- Ключа service_role у застосунку немає, тож чергу він читає через функції зі спільним секретом
-- (той самий рядок, що в private.promo_config — див. 0046).

create schema if not exists private;

/* ---------- налаштування сповіщень користувача ---------- */
create table if not exists public.notify_settings (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  email_leads      boolean not null default true,   -- ріелтору: заявки, візити, строк оголошень, модерація
  email_alerts     boolean not null default true,   -- покупцю: збережені пошуки, зниження ціни
  telegram_chat_id bigint,
  telegram_token   text not null default replace(gen_random_uuid()::text, '-', ''),
  unsub_token      text not null default replace(gen_random_uuid()::text, '-', ''),
  created_at       timestamptz not null default now()
);
create unique index if not exists notify_settings_tg_token on public.notify_settings (telegram_token);
create unique index if not exists notify_settings_unsub_token on public.notify_settings (unsub_token);
alter table public.notify_settings enable row level security;

drop policy if exists notify_settings_own on public.notify_settings;
create policy notify_settings_own on public.notify_settings for select using (user_id = (select auth.uid()));
drop policy if exists notify_settings_update on public.notify_settings;
create policy notify_settings_update on public.notify_settings for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- сам користувач може лише вмикати/вимикати листи й відʼєднати Telegram
create or replace function public.notify_settings_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.user_id is distinct from old.user_id
     or new.telegram_token is distinct from old.telegram_token
     or new.unsub_token is distinct from old.unsub_token
     or (new.telegram_chat_id is distinct from old.telegram_chat_id and new.telegram_chat_id is not null) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists notify_settings_guard on public.notify_settings;
create trigger notify_settings_guard before update on public.notify_settings
  for each row execute function public.notify_settings_guard();
revoke all on function public.notify_settings_guard() from public, anon, authenticated;

grant select on public.notify_settings to authenticated;
grant update (email_leads, email_alerts, telegram_chat_id) on public.notify_settings to authenticated;

insert into public.notify_settings (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.notify_settings_create()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notify_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists profiles_notify_settings on public.profiles;
create trigger profiles_notify_settings after insert on public.profiles
  for each row execute function public.notify_settings_create();
revoke all on function public.notify_settings_create() from public, anon, authenticated;

/* ---------- черга ---------- */
create table if not exists public.notify_outbox (
  id          bigint generated always as identity primary key,
  kind        text not null,
  user_id     uuid references public.profiles(id) on delete cascade,  -- адресат з акаунтом
  email       text not null default '',                               -- або адреса без акаунта
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  attempts    int not null default 0,
  locked_at   timestamptz,
  sent_at     timestamptz,
  last_error  text not null default ''
);
create index if not exists notify_outbox_pending on public.notify_outbox (id) where sent_at is null;
create index if not exists notify_outbox_user_idx on public.notify_outbox (user_id);
alter table public.notify_outbox enable row level security;
-- політик немає: читає й пише лише код із security definer
revoke all on public.notify_outbox from anon, authenticated;

alter table public.leads add column if not exists reminded_at timestamptz;
alter table public.saved_searches add column if not exists alerted_at timestamptz;

create or replace function private.secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_secret is not null and p_secret = (select secret from private.promo_config where id = 1)
$$;
revoke all on function private.secret_ok(text) from public, anon, authenticated;

/** Снапшот оголошення для листа: назва, ціна, фото, ЖК — щоб лист не залежав від змін після події. */
create or replace function private.listing_card(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', l.id, 'title', l.title, 'price', l.price, 'deal', l.deal, 'type', l.type,
    'neighborhood', l.neighborhood, 'photo', coalesce(l.photos[1], ''),
    'development', coalesce(d.name, ''), 'developmentSlug', coalesce(d.slug, ''))
  from public.listings l left join public.developments d on d.id = l.development_id
  where l.id = p_id
$$;
revoke all on function private.listing_card(uuid) from public, anon, authenticated;

/* ---------- події → черга ---------- */

-- Заявка або запис на візит: ріелтору — сповіщення, покупцю з email — підтвердження.
-- Перехід у WhatsApp — розмова вже йде в месенджері, сповіщати нема про що.
create or replace function public.notify_on_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_card  jsonb := private.listing_card(new.listing_id);
  v_agent record;
  v_lead  jsonb;
begin
  if new.channel = 'whatsapp' then return new; end if;
  select name, phone, whatsapp into v_agent from public.profiles where id = new.agent_id;
  v_lead := jsonb_build_object(
    'id', new.id, 'channel', new.channel, 'name', new.name, 'phone', new.phone, 'email', new.email,
    'message', new.message, 'visitAt', new.visit_at, 'interests', to_jsonb(new.interests),
    'contactVia', new.contact_via, 'listing', v_card);
  insert into public.notify_outbox (kind, user_id, payload) values ('lead_agent', new.agent_id, v_lead);
  if coalesce(new.email, '') <> '' then
    insert into public.notify_outbox (kind, email, payload) values ('lead_receipt', new.email,
      v_lead || jsonb_build_object('agent', jsonb_build_object(
        'name', coalesce(v_agent.name, ''), 'phone', coalesce(v_agent.phone, ''), 'whatsapp', coalesce(v_agent.whatsapp, ''))));
  end if;
  return new;
exception when others then
  -- сповіщення ніколи не ламає саму заявку
  raise warning 'notify_on_lead: %', sqlerrm;
  return new;
end $$;
drop trigger if exists leads_notify on public.leads;
create trigger leads_notify after insert on public.leads
  for each row execute function public.notify_on_lead();
revoke all on function public.notify_on_lead() from public, anon, authenticated;

-- Оголошення: зниження ціни (тим, хто зберіг), модерація (адмінам), рішення модерації (ріелтору)
create or replace function public.notify_on_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_card jsonb;
begin
  if tg_op = 'UPDATE' and new.price < old.price and new.deal = old.deal and new.active
     and new.review = 'approved' and (new.expires_at is null or new.expires_at > now()) then
    v_card := private.listing_card(new.id);
    insert into public.notify_outbox (kind, user_id, payload)
    select 'price_drop', f.user_id, v_card || jsonb_build_object('oldPrice', old.price)
    from public.favorites f where f.listing_id = new.id and f.user_id <> new.agent_id;
  end if;

  if new.review = 'pending' and (tg_op = 'INSERT' or old.review <> 'pending') then
    v_card := private.listing_card(new.id);
    insert into public.notify_outbox (kind, user_id, payload)
    select 'moderation', p.id, v_card || jsonb_build_object('duplicateOf', new.duplicate_of)
    from public.profiles p where p.is_admin and p.active;
  end if;

  if tg_op = 'UPDATE' and old.review = 'pending' and new.review in ('approved', 'rejected') then
    insert into public.notify_outbox (kind, user_id, payload) values ('review_result', new.agent_id,
      private.listing_card(new.id) || jsonb_build_object('review', new.review, 'note', new.review_note));
  end if;
  return new;
exception when others then
  raise warning 'notify_on_listing: %', sqlerrm;
  return new;
end $$;
drop trigger if exists listings_notify on public.listings;
create trigger listings_notify after insert or update on public.listings
  for each row execute function public.notify_on_listing();
revoke all on function public.notify_on_listing() from public, anon, authenticated;

-- Скарга: адмінам
create or replace function public.notify_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notify_outbox (kind, user_id, payload)
  select 'report', p.id, private.listing_card(new.listing_id)
    || jsonb_build_object('reason', new.reason, 'message', new.message)
  from public.profiles p where p.is_admin and p.active;
  return new;
exception when others then
  raise warning 'notify_on_report: %', sqlerrm;
  return new;
end $$;
drop trigger if exists listing_reports_notify on public.listing_reports;
create trigger listing_reports_notify after insert on public.listing_reports
  for each row execute function public.notify_on_report();
revoke all on function public.notify_on_report() from public, anon, authenticated;

/* ---------- планові події: нагадування про візит і строк оголошення ---------- */
create or replace function public.notify_schedule()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  -- візит завтра (за 20–28 годин): ріелтору й покупцю
  with due as (
    update public.leads set reminded_at = now()
    where channel = 'visit' and reminded_at is null and status <> 'done'
      and visit_at between now() + interval '20 hours' and now() + interval '28 hours'
    returning *
  ), agent as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'visit_reminder_agent', d.agent_id, jsonb_build_object('name', d.name, 'phone', d.phone,
      'visitAt', d.visit_at, 'listing', private.listing_card(d.listing_id)) from due d
    returning 1
  ), buyer as (
    insert into public.notify_outbox (kind, email, payload)
    select 'visit_reminder', d.email, jsonb_build_object('name', d.name, 'visitAt', d.visit_at,
      'listing', private.listing_card(d.listing_id)) from due d where coalesce(d.email, '') <> ''
    returning 1
  )
  select (select count(*) from agent) + (select count(*) from buyer) into k;
  n := n + k;

  -- строк показу спливає за 7 днів
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

  -- відправлене старше 60 днів більше не потрібне
  delete from public.notify_outbox where sent_at < now() - interval '60 days'
    or (sent_at is null and attempts >= 5 and created_at < now() - interval '60 days');
  return n;
end $$;
revoke all on function public.notify_schedule() from public, anon, authenticated;

/* ---------- функції для застосунку (лише з секретом) ---------- */

/**
 * Забрати партію на відправку. Адресата визначаємо зараз, а не при постановці в чергу:
 * людина могла вимкнути листи чи підʼєднати Telegram. Рядок без жодного каналу вважаємо відправленим.
 */
create or replace function public.notify_claim(p_secret text, p_limit int default 25)
returns table (id bigint, kind text, email text, name text, telegram_chat_id bigint, unsub_token text, payload jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
  with batch as (
    select o.id from public.notify_outbox o
    where o.sent_at is null and o.attempts < 5
      and (o.locked_at is null or o.locked_at < now() - interval '10 minutes')
    order by o.id limit least(greatest(p_limit, 1), 100)
    for update skip locked
  ), upd as (
    update public.notify_outbox o set attempts = o.attempts + 1, locked_at = now()
    from batch b where o.id = b.id
    returning o.*
  )
  select u.id, u.kind,
    case
      when u.user_id is null then u.email
      when not p.active then ''
      when u.kind in ('price_drop', 'saved_search') and not coalesce(s.email_alerts, true) then ''
      when u.kind not in ('price_drop', 'saved_search') and not coalesce(s.email_leads, true) then ''
      else coalesce(p.email, '')
    end,
    coalesce(p.name, u.payload->>'name', ''),
    case when u.kind in ('lead_agent', 'visit_reminder_agent', 'expiring', 'review_result', 'moderation', 'report')
      and coalesce(p.active, false) then s.telegram_chat_id end,
    case when u.user_id is not null then s.unsub_token end,
    u.payload
  from upd u
  left join public.profiles p on p.id = u.user_id
  left join public.notify_settings s on s.user_id = u.user_id
  order by u.id;
end $$;

create or replace function public.notify_done(p_secret text, p_id bigint, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.notify_outbox set
    sent_at = case when p_error is null then now() end,
    last_error = left(coalesce(p_error, ''), 500),
    locked_at = null
  where id = p_id;
end $$;

/** Збережені пошуки, яким пора надіслати добірку (раз на добу). */
create or replace function public.alerts_due(p_secret text)
returns table (id uuid, user_id uuid, title text, query text, since timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
  select s.id, s.user_id, s.title, s.query, coalesce(s.alerted_at, s.created_at)
  from public.saved_searches s
  join public.profiles p on p.id = s.user_id and p.active
  left join public.notify_settings n on n.user_id = s.user_id
  where coalesce(n.email_alerts, true)
    and coalesce(s.alerted_at, s.created_at) < now() - interval '20 hours'
  order by s.alerted_at nulls first
  limit 200;
end $$;

/** Відмітити пошук перевіреним; якщо є нові обʼєкти — поставити добірку в чергу. */
create or replace function public.alerts_mark(p_secret text, p_search uuid, p_payload jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.saved_searches set alerted_at = now() where id = p_search returning user_id into v_user;
  if v_user is not null and p_payload is not null then
    insert into public.notify_outbox (kind, user_id, payload) values ('saved_search', v_user, p_payload);
  end if;
end $$;

/** Бот отримав /start <токен> — привʼязуємо чат до акаунта. */
create or replace function public.telegram_link(p_secret text, p_token text, p_chat bigint)
returns text language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.notify_settings s set telegram_chat_id = p_chat
  where s.telegram_token = p_token
  returning (select name from public.profiles where id = s.user_id) into v_name;
  return v_name;
end $$;

/** Відписка за посиланням з листа: без входу, лише за токеном. */
create or replace function public.notify_unsubscribe(p_token text, p_what text default 'alerts')
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) < 20 then return false; end if;
  update public.notify_settings set
    email_alerts = case when p_what in ('alerts', 'all') then false else email_alerts end,
    email_leads  = case when p_what in ('leads', 'all') then false else email_leads end
  where unsub_token = p_token;
  return found;
end $$;

revoke all on function public.notify_claim(text, int) from public;
revoke all on function public.notify_done(text, bigint, text) from public;
revoke all on function public.alerts_due(text) from public;
revoke all on function public.alerts_mark(text, uuid, jsonb) from public;
revoke all on function public.telegram_link(text, text, bigint) from public;
revoke all on function public.notify_unsubscribe(text, text) from public;
-- застосунок ходить анонімним ключем: пускає секрет, а відписку — токен із листа
grant execute on function public.notify_claim(text, int) to anon, authenticated;
grant execute on function public.notify_done(text, bigint, text) to anon, authenticated;
grant execute on function public.alerts_due(text) to anon, authenticated;
grant execute on function public.alerts_mark(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.telegram_link(text, text, bigint) to anon, authenticated;
grant execute on function public.notify_unsubscribe(text, text) to anon, authenticated;

/* ---------- розклад ---------- */
-- Кожні 5 хвилин: планові події в чергу, потім штовхаємо застосунок відправити чергу.
-- Адреса сайту — у private.notify_config; без pg_net лишається лише перше, а відправку
-- запускають самі події (after() у застосунку) та щоденний Vercel Cron.
create table if not exists private.notify_config (
  id       int primary key default 1 check (id = 1),
  site_url text not null default 'https://resoha.vercel.app'
);
insert into private.notify_config (id) values (1) on conflict (id) do nothing;

create or replace function public.notify_tick()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_schedule();
  if exists (select 1 from public.notify_outbox where sent_at is null and attempts < 5)
     or exists (select 1 from public.saved_searches s
       left join public.notify_settings n on n.user_id = s.user_id
       where coalesce(n.email_alerts, true) and coalesce(s.alerted_at, s.created_at) < now() - interval '20 hours') then
    begin
      execute format(
        'select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb, timeout_milliseconds := 10000)',
        (select site_url from private.notify_config where id = 1) || '/api/cron/notify',
        jsonb_build_object('Content-Type', 'application/json',
          'x-notify-secret', (select secret from private.promo_config where id = 1))::text,
        '{}');
    exception when others then
      raise notice 'notify_tick: pg_net unavailable (%)', sqlerrm;
    end;
  end if;
end $$;
revoke all on function public.notify_tick() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net unavailable (%)', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'notify-tick';
  perform cron.schedule('notify-tick', '*/5 * * * *', 'select public.notify_tick()');
exception when others then
  raise notice 'pg_cron unavailable (%)', sqlerrm;
end $$;
