-- 1. Адмін заводить оголошення від імені ріелтора (наприклад, «listings desk»).
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert to authenticated
  with check (agent_id = (select auth.uid()) or public.is_admin());

-- 2. Службові колонки профілю. Політика profiles_update пускає власника до свого рядка
--    цілком, тож без цього тригера будь-хто міг прямим запитом у PostgREST виставити
--    собі is_admin, verified чи рейтинг. Функція навмисно НЕ security definer:
--    current_user має показувати, хто насправді виконує запит. RPC (join_agency,
--    refresh_agent_rating тощо) працюють від власника бази й сюди не впираються.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.is_admin is distinct from old.is_admin
     or new.verified is distinct from old.verified
     or new.active is distinct from old.active
     or new.role is distinct from old.role
     or new.rating is distinct from old.rating
     or new.reviews is distinct from old.reviews
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin can change this' using errcode = '42501';
  end if;

  -- агенцію міняють лише через join_agency / leave_agency / remove_member
  if new.agency_id is distinct from old.agency_id then
    raise exception 'Agency membership changes go through the agency tools' using errcode = '42501';
  end if;

  if new.is_owner is distinct from old.is_owner and not public.is_agency_owner(old.agency_id) then
    raise exception 'Only an agency owner can change owners' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- 3. Те саме для оголошень: добірка, лічильник переглядів і власник — не для ріелтора.
create or replace function public.listings_guard()
returns trigger language plpgsql set search_path = public as $$
declare owner record;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if public.is_admin() then
    -- адмін може записати оголошення на ріелтора; агенція завжди йде слідом за ним
    if tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id then
      select role, agency_id into owner from public.profiles where id = new.agent_id;
      if not found or owner.role <> 'agent' then
        raise exception 'A listing has to belong to a realtor';
      end if;
      new.agency_id := owner.agency_id;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.featured := false;
    new.views := 0;
    new.created_at := now();
    new.agency_id := (select agency_id from public.profiles where id = (select auth.uid()));
    return new;
  end if;

  if new.id is distinct from old.id
     or new.featured is distinct from old.featured
     or new.views is distinct from old.views
     or new.agent_id is distinct from old.agent_id
     or new.agency_id is distinct from old.agency_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin can change this' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists listings_guard on public.listings;
create trigger listings_guard before insert or update on public.listings
  for each row execute function public.listings_guard();
