-- Статистика просування по днях: покази й переходи кожної кампанії за кожен день
-- (за часом Роатана). Досі були лише загальні лічильники в promo_campaigns —
-- вони лишаються, promo_track тепер пише ще й сюди.
--
-- Міграція ідемпотентна; без DELETE і без DROP POLICY.

create table if not exists public.promo_daily (
  campaign_id uuid not null references public.promo_campaigns(id) on delete cascade,
  day         date not null,
  impressions int  not null default 0,
  clicks      int  not null default 0,
  primary key (campaign_id, day)
);
alter table public.promo_daily enable row level security;
-- політик немає: пише promo_track, читає promo_daily_stats (обидві security definer)
revoke all on public.promo_daily from anon, authenticated;

create or replace function public.promo_track(p_kind text, p_ids uuid[], p_field text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'America/Tegucigalpa')::date;
  v_live uuid[];
begin
  if p_field not in ('impression', 'click') then return; end if;
  with upd as (
    update public.promo_campaigns
      set impressions = impressions + (p_field = 'impression')::int,
          clicks      = clicks      + (p_field = 'click')::int
      where target_kind = p_kind and target_id = any(p_ids[1:60]) and status = 'active'
        and starts_at <= now() and ends_at > now()
      returning id
  )
  select array_agg(id) into v_live from upd;
  if v_live is null then return; end if;

  insert into public.promo_daily as d (campaign_id, day, impressions, clicks)
  select id, v_day, (p_field = 'impression')::int, (p_field = 'click')::int from unnest(v_live) as id
  on conflict (campaign_id, day) do update set
    impressions = d.impressions + excluded.impressions,
    clicks      = d.clicks + excluded.clicks;
end $$;
revoke all on function public.promo_track(text, uuid[], text) from public;
grant execute on function public.promo_track(text, uuid[], text) to anon, authenticated;

/** Покази й переходи по днях для своїх кампаній (адміну — для будь-яких). */
create or replace function public.promo_daily_stats(p_ids uuid[])
returns table (campaign_id uuid, day date, impressions int, clicks int)
language sql stable security definer set search_path = public as $$
  select d.campaign_id, d.day, d.impressions, d.clicks
  from public.promo_daily d
  join public.promo_campaigns c on c.id = d.campaign_id
  where d.campaign_id = any(p_ids[1:200]) and (c.owner_id = auth.uid() or public.is_admin())
  order by d.day
$$;
revoke all on function public.promo_daily_stats(uuid[]) from public, anon;
grant execute on function public.promo_daily_stats(uuid[]) to authenticated;
