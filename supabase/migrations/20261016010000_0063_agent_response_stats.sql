-- «Агент місяця»: публічний рейтинг ріелторів рахує, яку частку заявок ріелтор опрацював
-- за 24 години. Самі заявки закриті RLS, тому функція security definer віддає лише
-- агрегат: частку й медіану годин. Кількість заявок назовні не виходить — тільки ознака,
-- що їх достатньо (3+), щоб частка щось означала.
--
-- Міграція ідемпотентна; лише нова функція, таблиці й політики не змінюються.

create or replace function public.agent_response_stats(p_from timestamptz, p_to timestamptz)
returns table (agent_id uuid, enough boolean, answered_share numeric, median_hours numeric)
language sql stable security definer set search_path = public as $$
  select l.agent_id,
    count(*) >= 3,
    round(count(*) filter (where l.handled_at is not null and l.handled_at - l.created_at <= interval '24 hours')::numeric
      / count(*), 3),
    round((percentile_cont(0.5) within group (order by extract(epoch from (l.handled_at - l.created_at)) / 3600)
      filter (where l.handled_at is not null))::numeric, 1)
  from public.leads l
  join public.profiles p on p.id = l.agent_id and p.role = 'agent' and p.active
  -- вікно не довше 62 днів: рейтинг місячний, ширші запити не потрібні
  where l.created_at >= p_from and l.created_at < least(p_to, p_from + interval '62 days')
  group by l.agent_id
$$;
revoke all on function public.agent_response_stats(timestamptz, timestamptz) from public;
grant execute on function public.agent_response_stats(timestamptz, timestamptz) to anon, authenticated;
