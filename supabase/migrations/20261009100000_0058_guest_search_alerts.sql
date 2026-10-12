-- Підписка на пошук без акаунта: лише email, подвійне підтвердження листом, відписка за посиланням.
-- Живе в тій самій таблиці saved_searches (user_id порожній) і йде тією ж машинерією добірок (0050):
-- alerts_due → застосунок шукає нове → alerts_mark ставить лист у чергу notify_outbox.
-- Гостьові рядки RLS не віддає нікому (user_id = auth.uid() для null — хибно), пишуть лише функції нижче.
-- Без DELETE і DROP POLICY: відписка — це статус.

alter table public.saved_searches alter column user_id drop not null;
alter table public.saved_searches
  add column if not exists email           text not null default '',
  add column if not exists status          text not null default 'active',
  add column if not exists confirm_token   text,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists confirmed_at    timestamptz,
  add column if not exists unsub_token     text not null
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

alter table public.saved_searches drop constraint if exists saved_searches_status;
alter table public.saved_searches add constraint saved_searches_status
  check (status in ('pending', 'active', 'unsubscribed'));
alter table public.saved_searches drop constraint if exists saved_searches_owner;
alter table public.saved_searches add constraint saved_searches_owner
  check (user_id is not null or email <> '');

create unique index if not exists saved_searches_unsub_token on public.saved_searches (unsub_token);
create unique index if not exists saved_searches_confirm_token on public.saved_searches (confirm_token) where confirm_token is not null;
create index if not exists saved_searches_guest_email on public.saved_searches (email) where user_id is null;

/**
 * Гість підписується на пошук. Кличе лише застосунок (секрет), бо там же ліміт на IP.
 * Тут — ліміти на адресу, щоб чужу скриньку не засипали листами-підтвердженнями:
 * не більше 5 нових підписок на добу, 10 активних, повторний лист не частіше ніж раз на 10 хвилин,
 * і загальна стеля 300 підтверджень на годину.
 * Відповідь не каже, чи адреса вже була підписана: 'sent' або 'limited'.
 */
create or replace function public.search_subscribe(p_secret text, p_email text, p_title text, p_query text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_title text := left(btrim(coalesce(p_title, '')), 120);
  v_query text := left(coalesce(p_query, ''), 1000);
  v_row   public.saved_searches;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email' using errcode = '22023';
  end if;
  if v_title = '' then v_title := 'All listings'; end if;

  -- та сама адреса й той самий пошук: активний — нічого не шлемо, очікує — шлемо лист ще раз
  select * into v_row from public.saved_searches
  where user_id is null and email = v_email and query = v_query and status in ('pending', 'active')
  order by created_at desc limit 1;
  if found then
    if v_row.status = 'active' then return 'sent'; end if;
    if v_row.confirm_sent_at > now() - interval '10 minutes' then return 'sent'; end if;
    update public.saved_searches set confirm_token = v_token, confirm_sent_at = now(), title = v_title
    where id = v_row.id;
  else
    if (select count(*) from public.saved_searches
        where user_id is null and email = v_email and created_at > now() - interval '24 hours') >= 5
       or (select count(*) from public.saved_searches
        where user_id is null and email = v_email and status = 'active') >= 10
       or (select count(*) from public.saved_searches
        where user_id is null and confirm_sent_at > now() - interval '1 hour') >= 300 then
      return 'limited';
    end if;
    insert into public.saved_searches (user_id, email, title, query, status, confirm_token, confirm_sent_at)
    values (null, v_email, v_title, v_query, 'pending', v_token, now());
  end if;

  insert into public.notify_outbox (kind, email, payload)
  values ('search_confirm', v_email, jsonb_build_object('title', v_title, 'query', v_query, 'token', v_token));
  return 'sent';
end $$;

/** Підтвердження з листа. Повторне натискання нічого не ламає; непідтверджене гасне за 7 днів. */
create or replace function public.search_confirm(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_title text; v_query text;
begin
  if p_token is null or length(p_token) < 32 then return null; end if;
  update public.saved_searches set
    status = 'active',
    confirmed_at = coalesce(confirmed_at, now()),
    -- перша добірка — про те, що зʼявиться після підтвердження
    alerted_at = case when status = 'pending' then now() else alerted_at end
  where confirm_token = p_token and user_id is null
    and (status = 'active' or (status = 'pending' and confirm_sent_at > now() - interval '7 days'))
  returning title, query into v_title, v_query;
  if v_title is null then return null; end if;
  return jsonb_build_object('title', v_title, 'query', v_query);
end $$;

/** Відписка за посиланням із листа добірки — без входу, лише за токеном. */
create or replace function public.search_unsubscribe(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update public.saved_searches set status = 'unsubscribed'
  where unsub_token = p_token and user_id is null and status <> 'unsubscribed';
  return found or exists (select 1 from public.saved_searches where unsub_token = p_token and user_id is null);
end $$;

revoke all on function public.search_subscribe(text, text, text, text) from public;
revoke all on function public.search_confirm(text) from public;
revoke all on function public.search_unsubscribe(text) from public;
grant execute on function public.search_subscribe(text, text, text, text) to anon, authenticated;
grant execute on function public.search_confirm(text) to anon, authenticated;
grant execute on function public.search_unsubscribe(text) to anon, authenticated;

/* ---------- добірки (0050) тепер бачать і гостьові підписки ---------- */

create or replace function public.alerts_due(p_secret text)
returns table (id uuid, user_id uuid, title text, query text, since timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
  select s.id, s.user_id, s.title, s.query, coalesce(s.alerted_at, s.created_at)
  from public.saved_searches s
  left join public.profiles p on p.id = s.user_id
  left join public.notify_settings n on n.user_id = s.user_id
  where s.status = 'active'
    and ((s.user_id is not null and p.active and coalesce(n.email_alerts, true))
      or (s.user_id is null and s.confirmed_at is not null and s.email <> ''))
    and coalesce(s.alerted_at, s.created_at) < now() - interval '20 hours'
  order by s.alerted_at nulls first
  limit 200;
end $$;

create or replace function public.alerts_mark(p_secret text, p_search uuid, p_payload jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_email text; v_unsub text; v_status text;
begin
  if not private.secret_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.saved_searches set alerted_at = now() where id = p_search
  returning user_id, email, unsub_token, status into v_user, v_email, v_unsub, v_status;
  if p_payload is null or not found then return; end if;
  if v_user is not null then
    insert into public.notify_outbox (kind, user_id, payload) values ('saved_search', v_user, p_payload);
  elsif v_status = 'active' and coalesce(v_email, '') <> '' then
    -- гостю — на адресу підписки, з власним посиланням для відписки від цього пошуку
    insert into public.notify_outbox (kind, email, payload)
    values ('saved_search', v_email, p_payload || jsonb_build_object('searchUnsub', v_unsub));
  end if;
end $$;

-- той самий notify_tick, що в 0050, але гостьові підписки рахуються лише підтверджені
create or replace function public.notify_tick()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_schedule();
  if exists (select 1 from public.notify_outbox where sent_at is null and attempts < 5)
     or exists (select 1 from public.saved_searches s
       left join public.profiles p on p.id = s.user_id
       left join public.notify_settings n on n.user_id = s.user_id
       where s.status = 'active'
         and ((s.user_id is not null and p.active and coalesce(n.email_alerts, true))
           or (s.user_id is null and s.confirmed_at is not null))
         and coalesce(s.alerted_at, s.created_at) < now() - interval '20 hours') then
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
