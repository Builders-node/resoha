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
    case when u.kind in ('lead_agent', 'visit_reminder_agent', 'expiring', 'review_result', 'moderation', 'report')
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
