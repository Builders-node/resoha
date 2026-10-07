-- Що шукають покупці: кожен пошук (перша сторінка видачі) з фільтрами й кількістю
-- знайденого. Для адмінської аналітики попиту: які райони, типи й ціни хочуть,
-- і де пошук нічого не знаходить. Бачить лише адмін.

create table if not exists public.search_events (
  id         bigint generated always as identity primary key,
  deal       text not null default '',
  type       text not null default '',
  areas      text[] not null default '{}',
  price_min  numeric,
  price_max  numeric,
  beds       int[] not null default '{}',
  q          text not null default '',
  results    int not null default 0,
  device     text not null default 'desktop' check (device in ('mobile', 'desktop')),
  visitor    text not null default '',
  -- відбиток фільтрів: той самий пошук того ж відвідувача за 10 хв — один запис
  sig        text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists search_events_created_idx on public.search_events (created_at);
create index if not exists search_events_dedupe_idx on public.search_events (visitor, sig, created_at);

alter table public.search_events enable row level security;

drop policy if exists search_events_read on public.search_events;
create policy search_events_read on public.search_events for select using (public.is_admin());
revoke insert, update, delete on public.search_events from anon, authenticated;

create or replace function public.track_search(
  p_deal text, p_type text, p_areas text[], p_price_min numeric, p_price_max numeric,
  p_beds int[], p_q text, p_results int, p_device text, p_visitor text, p_sig text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.search_events
    where visitor = coalesce(p_visitor, '') and sig = coalesce(p_sig, '')
      and created_at > now() - interval '10 minutes'
  ) then return false; end if;

  insert into public.search_events (deal, type, areas, price_min, price_max, beds, q, results, device, visitor, sig)
  values (left(coalesce(p_deal, ''), 10), left(coalesce(p_type, ''), 20), coalesce(p_areas[1:10], '{}'),
          p_price_min, p_price_max, coalesce(p_beds[1:10], '{}'), left(coalesce(p_q, ''), 120),
          greatest(0, coalesce(p_results, 0)), coalesce(p_device, 'desktop'),
          left(coalesce(p_visitor, ''), 64), left(coalesce(p_sig, ''), 64));
  return true;
end $$;

revoke all on function public.track_search(text, text, text[], numeric, numeric, int[], text, int, text, text, text) from public;
grant execute on function public.track_search(text, text, text[], numeric, numeric, int[], text, int, text, text, text) to anon, authenticated;
