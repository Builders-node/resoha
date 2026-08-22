create or replace view public.agency_board
with (security_invoker = true) as
select
  ag.id, ag.name, ag.brand, ag.phone, ag.email, ag.about, ag.verified, ag.owner_id, ag.created_at,
  (select count(*) from public.listings l where l.agency_id = ag.id and l.active)                as listings_count,
  (select count(*) from public.profiles p where p.agency_id = ag.id and p.role = 'agent')        as agents_count
from public.agencies ag;

grant select on public.agency_board to anon, authenticated;
