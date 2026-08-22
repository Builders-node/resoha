-- 1. auth.uid() у політиках беремо через (select ...) — інакше воно рахується для кожного рядка
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (role = 'agent' or id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid()) or public.is_agency_owner(agency_id))
  with check (id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select
  using (active or agent_id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert
  with check (agent_id = (select auth.uid()));

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id))
  with check (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id));

drop policy if exists saved_own on public.saved_searches;
create policy saved_own on public.saved_searches for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 2. індекси на зовнішні ключі, які лишились без покриття
create index if not exists agencies_owner_idx        on public.agencies (owner_id);
create index if not exists favorites_listing_idx     on public.favorites (listing_id);
create index if not exists leads_agency_idx          on public.leads (agency_id);
create index if not exists leads_listing_idx         on public.leads (listing_id);
create index if not exists saved_searches_user_idx   on public.saved_searches (user_id);
