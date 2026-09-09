drop function if exists public.join_agency(text);

-- Повертаємо лише публічні поля агенції: код запрошення лишається у власника.
create function public.join_agency(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.profiles; a public.agencies;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role <> 'agent' then raise exception 'Only agent accounts can join an agency'; end if;
  if me.agency_id is not null then raise exception 'You are already part of an agency'; end if;

  select * into a from public.agencies where upper(invite_code) = upper(trim(p_code));
  if a is null then raise exception 'Invite code not found'; end if;

  update public.profiles set agency_id = a.id, is_owner = false where id = me.id;

  return jsonb_build_object(
    'id', a.id, 'name', a.name, 'brand', a.brand, 'phone', a.phone,
    'email', a.email, 'about', a.about, 'verified', a.verified,
    'owner_id', a.owner_id, 'created_at', a.created_at
  );
end $$;

revoke all on function public.join_agency(text) from public, anon;
grant execute on function public.join_agency(text) to authenticated;
