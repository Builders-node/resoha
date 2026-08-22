create or replace function public.gen_invite_code()
returns text language sql volatile as $$
  select (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1), '')
          from generate_series(1, 4))
      || '-' ||
         (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1), '')
          from generate_series(1, 4));
$$;

create or replace function public.create_agency(
  p_name text, p_phone text default '', p_email text default '',
  p_about text default '', p_brand text default '#16305c'
) returns public.agencies language plpgsql security definer set search_path = public as $$
declare me public.profiles; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role <> 'agent' then raise exception 'Only agent accounts can open an agency'; end if;
  if me.agency_id is not null then raise exception 'Leave your current agency first'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Agency name is required'; end if;

  insert into public.agencies (name, brand, phone, email, about, owner_id, invite_code)
  values (trim(p_name), p_brand, p_phone, p_email, p_about, me.id, public.gen_invite_code())
  returning * into a;

  update public.profiles set agency_id = a.id, is_owner = true where id = me.id;
  update public.listings set agency_id = a.id where agent_id = me.id;
  return a;
end $$;

create or replace function public.join_agency(p_code text)
returns public.agencies language plpgsql security definer set search_path = public as $$
declare me public.profiles; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role <> 'agent' then raise exception 'Only agent accounts can join an agency'; end if;
  if me.agency_id is not null then raise exception 'You are already part of an agency'; end if;

  select * into a from public.agencies where upper(invite_code) = upper(trim(p_code));
  if a is null then raise exception 'Invite code not found'; end if;

  update public.profiles set agency_id = a.id, is_owner = false where id = me.id;
  return a;
end $$;

create or replace function public.leave_agency()
returns boolean language plpgsql security definer set search_path = public as $$
declare me public.profiles; owners int; members int; closed boolean := false; ag uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.agency_id is null then raise exception 'You are not in an agency'; end if;
  ag := me.agency_id;

  select count(*) into owners from public.profiles where agency_id = ag and is_owner;
  select count(*) into members from public.profiles where agency_id = ag;
  if me.is_owner and owners = 1 and members > 1 then
    raise exception 'Hand ownership to another agent before leaving';
  end if;

  update public.listings set agency_id = null where agent_id = me.id;
  update public.profiles set agency_id = null, is_owner = false where id = me.id;

  if (select count(*) from public.profiles where agency_id = ag) = 0 then
    update public.listings set agency_id = null where agency_id = ag;
    delete from public.agencies where id = ag;
    closed := true;
  end if;
  return closed;
end $$;

create or replace function public.remove_member(p_member uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare me public.profiles; m public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  select * into m  from public.profiles where id = p_member;
  if me is null or not me.is_owner or me.agency_id is null then raise exception 'Only the agency owner can do this'; end if;
  if m is null or m.agency_id is distinct from me.agency_id then raise exception 'Not a member of your agency'; end if;
  if m.id = me.id then raise exception 'The owner cannot be removed'; end if;

  update public.listings set agency_id = null where agent_id = m.id;
  update public.profiles set agency_id = null, is_owner = false where id = m.id;
  return true;
end $$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare me public.profiles; code text;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or not me.is_owner or me.agency_id is null then raise exception 'Only the agency owner can do this'; end if;
  code := public.gen_invite_code();
  update public.agencies set invite_code = code where id = me.agency_id;
  return code;
end $$;

create or replace function public.bump_views(p_listing uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = p_listing;
$$;

grant execute on function public.create_agency(text, text, text, text, text) to authenticated;
grant execute on function public.join_agency(text)     to authenticated;
grant execute on function public.leave_agency()        to authenticated;
grant execute on function public.remove_member(uuid)   to authenticated;
grant execute on function public.rotate_invite_code()  to authenticated;
grant execute on function public.bump_views(uuid)      to anon, authenticated;
