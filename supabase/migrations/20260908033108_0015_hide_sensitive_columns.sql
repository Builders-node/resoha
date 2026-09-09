-- 1. Код запрошення не має бути публічним: з ним будь-хто вступав би в чужу агенцію.
revoke select (invite_code) on public.agencies from anon, authenticated;

-- Власник читає свій код через функцію, а не через таблицю.
create or replace function public.agency_invite_code()
returns text language plpgsql security definer stable set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or not me.is_owner or me.agency_id is null then
    raise exception 'Only the agency owner can see the invite code';
  end if;
  return (select invite_code from public.agencies where id = me.agency_id);
end $$;

revoke all on function public.agency_invite_code() from public, anon;
grant execute on function public.agency_invite_code() to authenticated;

-- 2. Пошта акаунта і прапорець адміна не потрібні анонімному відвідувачу:
--    пошта — це логін, а is_admin підказує, кого атакувати.
revoke select (email, is_admin) on public.profiles from anon;

-- 3. Тригерна функція не має бути викликуваною ззовні як RPC.
revoke all on function public.refresh_agent_rating() from public, anon, authenticated;

-- 4. Явно лишаємо доступ там, де він потрібен політикам RLS та застосунку.
grant execute on function public.is_admin()            to anon, authenticated;
grant execute on function public.is_agency_owner(uuid) to anon, authenticated;
grant execute on function public.bump_views(uuid)      to anon, authenticated;
