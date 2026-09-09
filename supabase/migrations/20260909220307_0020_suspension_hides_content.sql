-- Блокування акаунта досі було косметичним: оголошення й профіль лишались публічними.
-- Тепер `profiles.active = false` ховає і людину, і все, що вона виставила.

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select
  using (
    (
      active
      and exists (
        select 1 from public.profiles p
        where p.id = listings.agent_id and p.active
      )
    )
    or agent_id = (select auth.uid())
    or public.is_agency_owner(agency_id)
    or public.is_admin()
  );

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (
    (role = 'agent' and active)
    or id = (select auth.uid())
    or public.is_agency_owner(agency_id)
    or public.is_admin()
  );

-- Порада лінтера: зовнішній ключ автора відгуку не мав покривного індексу.
create index if not exists reviews_author_idx on public.reviews (author_id);
