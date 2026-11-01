-- Три речі з другого розбору платформи:
--  1) «обычно отвечает за N ч» на картці агента — медіана часу відповіді, публічно лише число;
--  2) прохання лишити відгук: лист покупцю через тиждень після звернення;
--  3) підписка на новини ЖК: нова новина — лист усім, хто стежить.
-- Міграція ідемпотентна; без DELETE і без DROP POLICY.

/* ---------- 1. час відповіді агента ---------- */
-- Самі заявки закриті RLS; назовні віддаємо лише медіану в годинах і кількість, від 3 оброблених заявок за пів року.
create or replace function public.agent_reply_stats(p_agent uuid default null)
returns table (agent_id uuid, hours numeric, handled int)
language sql stable security definer set search_path = public as $$
  select l.agent_id,
    round((percentile_cont(0.5) within group (order by extract(epoch from (l.handled_at - l.created_at)) / 3600))::numeric, 1),
    count(*)::int
  from public.leads l
  where l.handled_at is not null and l.handled_at >= l.created_at
    and l.created_at > now() - interval '180 days'
    and (p_agent is null or l.agent_id = p_agent)
  group by l.agent_id
  having count(*) >= 3
$$;
revoke all on function public.agent_reply_stats(uuid) from public;
grant execute on function public.agent_reply_stats(uuid) to anon, authenticated;

/* ---------- 2. прохання про відгук ---------- */
alter table public.leads add column if not exists review_requested_at timestamptz;

-- старі заявки не чіпаємо: листи лише по зверненнях після цієї міграції
update public.leads set review_requested_at = now()
where review_requested_at is null and created_at < now() - interval '7 days';

create or replace function public.review_remind()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with due as (
    -- звернення з акаунта (лише такі дають право на відгук, див. 0022), тиждень тому;
    -- для запису в офіс — через день після самого візиту
    select distinct on (l.user_id, l.agent_id) l.id, l.user_id, l.agent_id, l.listing_id
    from public.leads l
    where l.review_requested_at is null and l.user_id is not null and l.agent_id is not null
      and l.user_id <> l.agent_id and l.status <> 'lost'
      and coalesce(l.visit_at + interval '1 day', l.created_at + interval '7 days') <= now()
      and l.created_at > now() - interval '45 days'
      and not exists (select 1 from public.reviews r where r.agent_id = l.agent_id and r.author_id = l.user_id)
      and not exists (select 1 from public.leads x where x.user_id = l.user_id and x.agent_id = l.agent_id
                        and x.review_requested_at is not null and x.id <> l.id)
    order by l.user_id, l.agent_id, l.created_at
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'review_request', d.user_id, jsonb_build_object(
      'agentId', d.agent_id, 'agentName', coalesce(p.name, ''), 'listingTitle', coalesce(li.title, ''))
    from due d
    join public.profiles p on p.id = d.agent_id
    left join public.listings li on li.id = d.listing_id
    returning 1
  )
  select count(*) into n from ins;
  -- позначаємо всі звернення до цих пар, щоб другий лист не прийшов
  update public.leads l set review_requested_at = now()
  where l.review_requested_at is null and l.user_id is not null and l.agent_id is not null
    and coalesce(l.visit_at + interval '1 day', l.created_at + interval '7 days') <= now();
  return n;
end $$;
revoke all on function public.review_remind() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('review-remind', '20 15 * * *', 'select public.review_remind()');
exception when others then
  raise notice 'pg_cron unavailable (%)', sqlerrm;
end $$;

/* ---------- 3. підписка на новини ЖК ---------- */
create table if not exists public.development_follows (
  development_id uuid not null references public.developments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (development_id, user_id)
);
alter table public.development_follows enable row level security;

do $$
begin
  create policy dev_follows_own_read on public.development_follows for select to authenticated
    using (user_id = (select auth.uid()));
  create policy dev_follows_own_add on public.development_follows for insert to authenticated
    with check (user_id = (select auth.uid()));
  create policy dev_follows_own_remove on public.development_follows for delete to authenticated
    using (user_id = (select auth.uid()));
exception when duplicate_object then null;
end $$;
grant select, insert, delete on public.development_follows to authenticated;

-- скільки людей стежить — публічно, без імен
create or replace function public.development_followers(p_development uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.development_follows where development_id = p_development
$$;
grant execute on function public.development_followers(uuid) to anon, authenticated;

create or replace function public.development_news_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notify_outbox (kind, user_id, payload)
  select 'dev_news', f.user_id, jsonb_build_object(
    'development', d.name, 'slug', d.slug, 'title', new.title,
    'body', left(coalesce(new.body, ''), 600), 'photo', coalesce(new.photo, ''))
  from public.development_follows f
  join public.developments d on d.id = new.development_id
  where f.development_id = new.development_id and d.active;
  return new;
end $$;

drop trigger if exists development_news_notify on public.development_news;
create trigger development_news_notify after insert on public.development_news
  for each row execute function public.development_news_notify();

/* ---------- «перезвонить завтра»: нагадування по заявці ріелтору (лист і Telegram) ---------- */
alter table public.leads add column if not exists remind_at timestamptz;
alter table public.leads add column if not exists remind_sent_at timestamptz;
create index if not exists leads_remind_idx on public.leads (remind_at) where remind_at is not null;

create or replace function public.lead_remind_tick()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with due as (
    update public.leads l set remind_sent_at = now()
    where l.remind_at is not null and l.remind_at <= now()
      and (l.remind_sent_at is null or l.remind_sent_at < l.remind_at)
      and l.status not in ('lost', 'deal')
    returning l.id, l.agent_id, l.name, l.phone, l.email, l.listing_id
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'lead_remind_agent', d.agent_id, jsonb_build_object(
      'leadId', d.id, 'name', d.name, 'phone', d.phone, 'email', coalesce(d.email, ''),
      'listingId', d.listing_id, 'listingTitle', coalesce(li.title, ''))
    from due d left join public.listings li on li.id = d.listing_id
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function public.lead_remind_tick() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('lead-remind', '*/10 * * * *', 'select public.lead_remind_tick()');
exception when others then
  raise notice 'pg_cron unavailable (%)', sqlerrm;
end $$;

/* ---------- черга: нові листи покупцям — за налаштуванням «добірки» ---------- */
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
      when u.kind in ('price_drop', 'saved_search', 'review_request', 'dev_news') and not coalesce(s.email_alerts, true) then ''
      when u.kind not in ('price_drop', 'saved_search', 'review_request', 'dev_news') and not coalesce(s.email_leads, true) then ''
      else coalesce(p.email, '')
    end,
    coalesce(p.name, u.payload->>'name', ''),
    case when u.kind in ('lead_agent', 'lead_remind_agent', 'visit_reminder_agent', 'expiring', 'review_result', 'moderation', 'report')
      and coalesce(p.active, false) then s.telegram_chat_id end,
    case when u.user_id is not null then s.unsub_token end,
    u.payload
  from upd u
  left join public.profiles p on p.id = u.user_id
  left join public.notify_settings s on s.user_id = u.user_id
  order by u.id;
end $$;
revoke all on function public.notify_claim(text, int) from public;
grant execute on function public.notify_claim(text, int) to anon, authenticated;

/* ---------- розстрочка ЖК у цифрах: внесок %, місяців, ставка, банки-партнери ---------- */
alter table public.developments add column if not exists finance jsonb not null default '{}'::jsonb;

/* ---------- щотижневий звіт ріелтору й забудовнику: перегляди, контакти, заявки, візити ---------- */
create or replace function public.weekly_report_tick()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ev as (
    select e.agent_id,
      count(*) filter (where e.kind in ('view', 'dev_view') and e.created_at >= now() - interval '7 days') as views,
      count(*) filter (where e.kind in ('view', 'dev_view') and e.created_at <  now() - interval '7 days') as views_prev,
      count(*) filter (where e.kind in ('phone', 'whatsapp', 'viber', 'telegram') and e.created_at >= now() - interval '7 days') as contacts
    from public.listing_events e
    where e.created_at >= now() - interval '14 days'
    group by e.agent_id
  ), ld as (
    select l.agent_id,
      count(*) filter (where l.created_at >= now() - interval '7 days') as leads,
      count(*) filter (where l.created_at >= now() - interval '14 days' and l.created_at < now() - interval '7 days') as leads_prev,
      count(*) filter (where l.channel = 'visit' and l.created_at >= now() - interval '7 days') as visits,
      count(*) filter (where l.status = 'new') as unanswered
    from public.leads l
    where l.created_at >= now() - interval '14 days' or l.status = 'new'
    group by l.agent_id
  ), top as (
    select x.agent_id, jsonb_agg(jsonb_build_object('title', x.title, 'views', x.n) order by x.n desc) as items
    from (
      select e.agent_id, coalesce(li.title, d.name) as title, count(*) as n,
        row_number() over (partition by e.agent_id order by count(*) desc) as rk
      from public.listing_events e
      left join public.listings li on li.id = e.listing_id
      left join public.developments d on d.id = e.development_id
      where e.kind in ('view', 'dev_view') and e.created_at >= now() - interval '7 days'
      group by e.agent_id, coalesce(li.title, d.name)
    ) x
    where x.rk <= 3
    group by x.agent_id
  ), who as (
    select p.id, coalesce(ev.views, 0) views, coalesce(ev.views_prev, 0) views_prev, coalesce(ev.contacts, 0) contacts,
      coalesce(ld.leads, 0) leads, coalesce(ld.leads_prev, 0) leads_prev, coalesce(ld.visits, 0) visits,
      coalesce(ld.unanswered, 0) unanswered, coalesce(top.items, '[]'::jsonb) top
    from public.profiles p
    left join ev on ev.agent_id = p.id
    left join ld on ld.agent_id = p.id
    left join top on top.agent_id = p.id
    where p.role = 'agent' and p.active and (coalesce(ev.views, 0) + coalesce(ld.leads, 0) + coalesce(ld.unanswered, 0)) > 0
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'weekly_report', w.id, jsonb_build_object(
      'from', to_char(now() - interval '7 days', 'YYYY-MM-DD'), 'to', to_char(now(), 'YYYY-MM-DD'),
      'views', w.views, 'viewsPrev', w.views_prev, 'contacts', w.contacts, 'leads', w.leads, 'leadsPrev', w.leads_prev,
      'visits', w.visits, 'unanswered', w.unanswered, 'top', w.top)
    from who w
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function public.weekly_report_tick() from public, anon, authenticated;

do $$
begin
  -- понеділок, 13:00 UTC — 7:00 у Гондурасі, до початку робочого дня
  perform cron.schedule('weekly-report', '0 13 * * 1', 'select public.weekly_report_tick()');
exception when others then
  raise notice 'pg_cron unavailable (%)', sqlerrm;
end $$;
