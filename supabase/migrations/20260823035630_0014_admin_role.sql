-- Адміністратор платформи: окремий прапорець, бо адмін може бути й ріелтором.
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- Профілі: адмін бачить усі акаунти (включно з покупцями) і може їх редагувати
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (
    role = 'agent'
    or id = (select auth.uid())
    or public.is_agency_owner(agency_id)
    or public.is_admin()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());

-- Оголошення: адмін бачить і сховані, може знімати з публікації, піднімати в добірку, видаляти
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select
  using (active or agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin())
  with check (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete
  using (agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin());

-- Агенції: адмін підтверджує та редагує будь-яку
drop policy if exists agencies_update on public.agencies;
create policy agencies_update on public.agencies for update
  using (public.is_agency_owner(id) or public.is_admin())
  with check (public.is_agency_owner(id) or public.is_admin());

drop policy if exists agencies_delete on public.agencies;
create policy agencies_delete on public.agencies for delete using (public.is_admin());

-- Відгуки: адмін прибирає образливі
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- Заявки: адмін бачить усі (для розбору скарг), але не редагує чужі
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select
  using (
    agent_id = (select auth.uid())
    or user_id = (select auth.uid())
    or public.is_agency_owner(agency_id)
    or public.is_admin()
  );
