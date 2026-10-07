-- Кілька команд на один акаунт. Членство тепер живе в agency_members (людина ↔ агенція),
-- а profiles.agency_id / is_owner лишаються «активною командою» — тією, у якій зараз
-- працює кабінет. Через це всі старі політики й тригери (нове оголошення чи ЖК бере
-- агенцію з профілю) працюють без змін. Активну команду міняє RPC switch_agency.

create table if not exists public.agency_members (
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_owner   boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (agency_id, profile_id)
);
create index if not exists agency_members_profile_idx on public.agency_members (profile_id);

-- Нинішні члени агенцій переїжджають у таблицю членства.
insert into public.agency_members (agency_id, profile_id, is_owner, joined_at)
select agency_id, id, is_owner, created_at from public.profiles where agency_id is not null
on conflict do nothing;

-- Склад команди публічний (сторінка агенції його й так показує). Пишуть лише RPC нижче.
alter table public.agency_members enable row level security;
drop policy if exists agency_members_read on public.agency_members;
create policy agency_members_read on public.agency_members for select using (true);
revoke insert, update, delete on public.agency_members from anon, authenticated;
grant select on public.agency_members to anon, authenticated;

-- Власник бачить і веде всі свої команди, а не лише активну.
create or replace function public.is_agency_owner(a uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.agency_members m
    where m.agency_id = a and m.profile_id = auth.uid() and m.is_owner
  );
$$;

-- Чи є викликач власником хоча б однієї команди, де складається ця людина.
create or replace function public.manages_member(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.agency_members me
    join public.agency_members m on m.agency_id = me.agency_id
    where me.profile_id = auth.uid() and me.is_owner and m.profile_id = p
  );
$$;
grant execute on function public.manages_member(uuid) to anon, authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (
    (role = 'agent' and active)
    or id = (select auth.uid())
    or public.manages_member(id)
    or public.is_admin()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid()) or public.manages_member(id) or public.is_admin())
  with check (id = (select auth.uid()) or public.manages_member(id) or public.is_admin());

-- Профіль — дзеркало членства: якщо активної команди більше немає, беремо найстарішу з решти.
create or replace function public.sync_active_agency(p uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur uuid; m public.agency_members;
begin
  select agency_id into cur from public.profiles where id = p;
  if not found then return; end if;

  select * into m from public.agency_members where profile_id = p and agency_id = cur;
  if not found then
    select * into m from public.agency_members where profile_id = p order by joined_at limit 1;
  end if;

  update public.profiles
     set agency_id = m.agency_id, is_owner = coalesce(m.is_owner, false)
   where id = p
     and (agency_id is distinct from m.agency_id or is_owner is distinct from coalesce(m.is_owner, false));
end $$;
revoke all on function public.sync_active_agency(uuid) from public, anon, authenticated;

create or replace function public.agency_members_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_active_agency(coalesce(new.profile_id, old.profile_id));
  return null;
end $$;
revoke all on function public.agency_members_sync() from public, anon, authenticated;

drop trigger if exists agency_members_sync on public.agency_members;
create trigger agency_members_sync after insert or update or delete on public.agency_members
  for each row execute function public.agency_members_sync();

-- Правило «в агенції завжди є власник» тепер перевіряють RPC по agency_members.
-- Старий тригер рахував власників по profiles і заважав би перемикатись між командами.
drop trigger if exists profiles_owner_guard on public.profiles;

-- Ті самі службові колонки, що й у 0024; is_owner тепер міняє лише set_member_owner.
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

  if new.agency_id is distinct from old.agency_id or new.is_owner is distinct from old.is_owner then
    raise exception 'Agency membership changes go through the agency tools' using errcode = '42501';
  end if;

  return new;
end $$;

/* ---------- RPC ---------- */

-- Нова команда: можна мати скільки завгодно. Незалежні оголошення переходять у неї,
-- а ті, що вже в іншій команді, лишаються там.
create or replace function public.create_agency(
  p_name text, p_phone text default '', p_email text default '',
  p_about text default '', p_brand text default '#16305c'
) returns public.agencies language plpgsql security definer set search_path = public as $$
declare me public.profiles; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role <> 'agent' then raise exception 'Only agent accounts can open an agency'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Agency name is required'; end if;

  insert into public.agencies (name, brand, phone, email, about, owner_id, invite_code)
  values (trim(p_name), p_brand, p_phone, p_email, p_about, me.id, public.gen_invite_code())
  returning * into a;

  insert into public.agency_members (agency_id, profile_id, is_owner) values (a.id, me.id, true);
  update public.profiles set agency_id = a.id, is_owner = true where id = me.id;
  update public.listings set agency_id = a.id where agent_id = me.id and agency_id is null;
  return a;
end $$;

create or replace function public.join_agency(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.profiles; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role <> 'agent' then raise exception 'Only agent accounts can join an agency'; end if;

  select * into a from public.agencies where upper(invite_code) = upper(trim(p_code));
  if a is null then raise exception 'Invite code not found'; end if;
  if exists (select 1 from public.agency_members where agency_id = a.id and profile_id = me.id) then
    raise exception 'You are already in this agency';
  end if;

  insert into public.agency_members (agency_id, profile_id, is_owner) values (a.id, me.id, false);
  update public.profiles set agency_id = a.id, is_owner = false where id = me.id;

  return jsonb_build_object(
    'id', a.id, 'name', a.name, 'brand', a.brand, 'phone', a.phone,
    'email', a.email, 'about', a.about, 'verified', a.verified,
    'owner_id', a.owner_id, 'created_at', a.created_at
  );
end $$;

-- Перемкнути активну команду кабінету.
create or replace function public.switch_agency(p_agency uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.agency_members;
begin
  select * into m from public.agency_members where agency_id = p_agency and profile_id = auth.uid();
  if not found then raise exception 'You are not in this agency'; end if;
  update public.profiles set agency_id = m.agency_id, is_owner = m.is_owner where id = auth.uid();
end $$;

-- Вийти з активної команди. Якщо є інші — кабінет перемкнеться на одну з них.
create or replace function public.leave_agency()
returns boolean language plpgsql security definer set search_path = public as $$
declare me public.profiles; mine public.agency_members; owners int; members int; ag uuid; closed boolean := false;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null then raise exception 'You are not in an agency'; end if;
  ag := me.agency_id;
  select * into mine from public.agency_members where agency_id = ag and profile_id = me.id;

  select count(*) into owners  from public.agency_members where agency_id = ag and is_owner;
  select count(*) into members from public.agency_members where agency_id = ag;
  if mine.is_owner and owners = 1 and members > 1 then
    raise exception 'Hand ownership to another agent before leaving';
  end if;

  update public.listings set agency_id = null where agent_id = me.id and agency_id = ag;
  delete from public.agency_members where agency_id = ag and profile_id = me.id;
  -- рядка членства могло не бути (дані до 0040) — профіль однаково відпускаємо
  update public.profiles set agency_id = null, is_owner = false where id = me.id and agency_id = ag;
  perform public.sync_active_agency(me.id);

  if not exists (select 1 from public.agency_members where agency_id = ag) then
    update public.listings set agency_id = null where agency_id = ag;
    delete from public.agencies where id = ag;
    closed := true;
  end if;
  return closed;
end $$;

-- Власник активної команди прибирає з неї колегу. З інших команд колега не зникає.
create or replace function public.remove_member(p_member uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.is_agency_owner(me.agency_id) then
    raise exception 'Only the agency owner can do this';
  end if;
  if p_member = me.id then raise exception 'The owner cannot be removed'; end if;
  if not exists (select 1 from public.agency_members where agency_id = me.agency_id and profile_id = p_member) then
    raise exception 'Not a member of your agency';
  end if;

  update public.listings set agency_id = null where agent_id = p_member and agency_id = me.agency_id;
  delete from public.agency_members where agency_id = me.agency_id and profile_id = p_member;
  return true;
end $$;

-- Зробити колегу власником активної команди або повернути в агенти.
create or replace function public.set_member_owner(p_member uuid, p_owner boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.is_agency_owner(me.agency_id) then
    raise exception 'Only the agency owner can do this';
  end if;
  if not exists (select 1 from public.agency_members where agency_id = me.agency_id and profile_id = p_member) then
    raise exception 'Not a member of your agency';
  end if;
  if not p_owner and not exists (
    select 1 from public.agency_members
    where agency_id = me.agency_id and is_owner and profile_id <> p_member
  ) then
    raise exception 'The agency needs at least one owner';
  end if;

  update public.agency_members set is_owner = p_owner
   where agency_id = me.agency_id and profile_id = p_member;
  return true;
end $$;

-- Код запрошення: власник активної команди (перевірка по членству, а не по дзеркалу).
create or replace function public.agency_invite_code()
returns text language plpgsql security definer stable set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.is_agency_owner(me.agency_id) then
    raise exception 'Only the agency owner can see the invite code';
  end if;
  return (select invite_code from public.agencies where id = me.agency_id);
end $$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare me public.profiles; code text;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null or not public.is_agency_owner(me.agency_id) then
    raise exception 'Only the agency owner can do this';
  end if;
  code := public.gen_invite_code();
  update public.agencies set invite_code = code where id = me.agency_id;
  return code;
end $$;

revoke all on function public.switch_agency(uuid)            from public, anon;
revoke all on function public.set_member_owner(uuid, boolean) from public, anon;
grant execute on function public.switch_agency(uuid)            to authenticated;
grant execute on function public.set_member_owner(uuid, boolean) to authenticated;

-- Лічильник агентів на дошці агенцій — по членству, а не по активній команді.
create or replace view public.agency_board
with (security_invoker = true) as
select
  ag.id, ag.name, ag.brand, ag.phone, ag.email, ag.about, ag.verified, ag.owner_id, ag.created_at,
  (select count(*) from public.listings l where l.agency_id = ag.id and l.active) as listings_count,
  (select count(*) from public.agency_members m join public.profiles p on p.id = m.profile_id
    where m.agency_id = ag.id and p.role = 'agent')                                as agents_count
from public.agencies ag;
