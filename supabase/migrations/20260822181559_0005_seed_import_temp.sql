-- Тимчасова функція імпорту демо-даних. Працює лише поки база порожня; видаляється після сидування.
create or replace function public.seed_import(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a jsonb; u jsonb; l jsonb;
  uid uuid; agency_id uuid;
  n_agencies int := 0; n_users int := 0; n_listings int := 0;
begin
  if (select count(*) from public.listings) > 0 or (select count(*) from auth.users) > 0 then
    raise exception 'Database is not empty — seeding refused';
  end if;

  for a in select * from jsonb_array_elements(payload->'agencies') loop
    insert into public.agencies (name, brand, phone, email, about, verified, invite_code)
    values (a->>'name', a->>'brand', a->>'phone', a->>'email', a->>'about', true, public.gen_invite_code());
    n_agencies := n_agencies + 1;
  end loop;

  for u in select * from jsonb_array_elements(payload->'users') loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      u->>'email', crypt(payload->>'password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', u->>'name', 'role', u->>'role', 'phone', u->>'phone'),
      now(), now()
    ) returning id into uid;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'email', u->>'email'), 'email', u->>'email', now(), now(), now());

    select id into agency_id from public.agencies where name = (u->>'agency_name');

    update public.profiles set
      name = u->>'name', avatar = u->>'avatar', phone = u->>'phone', whatsapp = u->>'whatsapp',
      agency_id = agency_id, is_owner = (u->>'is_owner')::boolean,
      experience = (u->>'experience')::int, rating = (u->>'rating')::numeric,
      reviews = (u->>'reviews')::int, verified = (u->>'verified')::boolean,
      languages = array(select jsonb_array_elements_text(u->'languages')),
      about = u->>'about', active = true
    where id = uid;
    n_users := n_users + 1;
  end loop;

  update public.agencies ag set owner_id = p.id
  from public.profiles p where p.agency_id = ag.id and p.is_owner;

  for l in select * from jsonb_array_elements(payload->'listings') loop
    insert into public.listings (
      deal, type, title, island, neighborhood, address, price, hoa, beds, baths, sqft, lot_acres, year,
      oceanfront, titled, owner_financing, lat, lng, agent_id, agency_id, featured, active, views,
      tags, photos, body, created_at
    ) values (
      l->>'deal', l->>'type', l->>'title', l->>'island', l->>'neighborhood', l->>'address',
      (l->>'price')::numeric, (l->>'hoa')::numeric, (l->>'beds')::int, (l->>'baths')::numeric,
      (l->>'sqft')::int, (l->>'lot_acres')::numeric, (l->>'year')::int,
      (l->>'oceanfront')::boolean, (l->>'titled')::boolean, (l->>'owner_financing')::boolean,
      (l->>'lat')::double precision, (l->>'lng')::double precision,
      (select id from public.profiles where email = l->>'agent_email'),
      (select id from public.agencies where name = l->>'agency_name'),
      (l->>'featured')::boolean, (l->>'active')::boolean, (l->>'views')::int,
      array(select jsonb_array_elements_text(l->'tags')),
      array(select jsonb_array_elements_text(l->'photos')),
      l->>'body', (l->>'created_at')::timestamptz
    );
    n_listings := n_listings + 1;
  end loop;

  for l in select * from jsonb_array_elements(payload->'leads') loop
    insert into public.leads (listing_id, agent_id, agency_id, name, phone, message, status, created_at)
    select li.id, li.agent_id, li.agency_id, l->>'name', l->>'phone', l->>'message', l->>'status', (l->>'created_at')::timestamptz
    from public.listings li where li.title = l->>'listing_title' limit 1;
  end loop;

  for l in select * from jsonb_array_elements(payload->'saved_searches') loop
    insert into public.saved_searches (user_id, title, query, created_at)
    select p.id, l->>'title', l->>'query', (l->>'created_at')::timestamptz
    from public.profiles p where p.email = l->>'user_email';
  end loop;

  for l in select * from jsonb_array_elements(payload->'favorites') loop
    insert into public.favorites (user_id, listing_id)
    select p.id, li.id from public.profiles p, public.listings li
    where p.email = l->>'user_email' and li.title = l->>'listing_title' limit 1;
  end loop;

  return jsonb_build_object('agencies', n_agencies, 'users', n_users, 'listings', n_listings);
end $$;

grant execute on function public.seed_import(jsonb) to anon, authenticated;
