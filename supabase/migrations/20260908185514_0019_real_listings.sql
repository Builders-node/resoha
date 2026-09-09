-- Прибираємо згенерований демо-сід (вигадані агенції, ріелтори, 64 оголошення,
-- відгуки, заявки) і заводимо реальні об'єкти з публічних оголошень острівних агенцій.
-- Кожен рядок несе source_name / source_ref / source_url — звідки взяті факти.

-- 1. Акаунт, від імені якого платформа тримає оголошення зі сторонніх джерел.
do $$
declare desk uuid;
begin
  select id into desk from auth.users where email = 'listings@resoha.dev';
  if desk is null then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'listings@resoha.dev', crypt('Roatan-Desk-2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Resoha listings desk","role":"agent"}'::jsonb,
      now(), now(), '', '', '', '', ''
    ) returning id into desk;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), desk, jsonb_build_object('sub', desk::text, 'email', 'listings@resoha.dev'),
            'email', 'listings@resoha.dev', now(), now(), now());
  end if;

  update public.profiles set
    role = 'agent',
    name = 'Resoha listings desk',
    phone = '',
    whatsapp = '',
    verified = false,
    languages = array['English', 'Español'],
    about = 'Not a broker. This account holds listings Resoha collected from the public '
         || 'listings of island agencies; every property links back to the agency that has it. '
         || 'Enquiries left here are forwarded to that agency.'
  where id = desk;
end $$;

-- 2. Чистимо все вигадане. Порядок — від залежних таблиць до кореня.
delete from public.reviews;
delete from public.leads;
delete from public.favorites;
delete from public.saved_searches;
delete from public.listings;
delete from auth.users where email not in ('admin@resoha.dev', 'listings@resoha.dev');
delete from public.agencies;

-- 3. Реальні об'єкти. Координати — з OpenStreetMap за назвою комплексу чи району,
--    тож для оренди піни показують район, а не конкретну квартиру.
insert into public.listings (
  deal, type, title, neighborhood, address, price, beds, baths, sqft, lot_acres, year,
  oceanfront, titled, lat, lng, agent_id, featured, tags, body,
  source_name, source_ref, source_url, created_at
)
select v.deal, v.type, v.title, v.neighborhood, v.address, v.price, v.beds, v.baths, v.sqft,
       v.lot_acres, v.year, v.oceanfront, v.titled, v.lat, v.lng,
       (select id from public.profiles where name = 'Resoha listings desk'),
       v.featured, v.tags, v.body, v.source_name, v.source_ref, v.source_url,
       now() - (v.age || ' minutes')::interval
from (values
  ('sale', 'condo', '1BR condo at Infinity Bay Beach Resort, West Bay',
   'West Bay', 'Infinity Bay Spa & Beach Resort, West Bay Beach',
   274900, 1, 1.0, 736, 0.00, 0, true, false, 16.2728227, -86.5996744, true,
   array['Pool', 'Ocean view'],
   'One-bedroom, one-bath unit of 736 ft² inside Infinity Bay Spa & Beach Resort, right on West Bay Beach. '
   || 'The amenities are the resort''s: beachfront infinity pool, restaurants, spa, fitness room, dive shop, '
   || 'concierge and 24/7 security. Price, size and unit number are as published by the listing agency — '
   || 'ask them for the HOA schedule, the rental history and the title documents before you commit.',
   'Roatan Executive Realty', 'MLS 26-263',
   'https://roatanexecutiverealty.com/listings/infinity-bay-condo-2001/', 5),

  ('sale', 'condo', 'Beachfront condo 9-2 at Parrot Tree Plantation',
   'Parrot Tree', 'Parrot Tree Plantation, building 9, ground floor',
   139950, 1, 1.0, 839, 0.00, 2010, true, false, 16.3640929, -86.4130629, true,
   array['Pool', 'Gated', 'Turnkey', 'Ocean view'],
   'Ground-floor beachfront unit in building 9 at Parrot Tree Plantation on the south shore, built in 2010 — '
   || '839 ft², one bed, one bath, sold furnished. Community side: a 320-foot pool with waterslide, private beach, '
   || 'marina, backup generator, on-site clinic and 24-hour security. Figures as published by the listing agency.',
   'Century 21 Roatan', 'MLS 24-382',
   'https://century21roatan.com/property/beachfront-condo-9-2-in-parrot-tree-roatan-honduras/', 20),

  ('sale', 'condo', 'Beachfront condo 9-4 at Parrot Tree Plantation',
   'Parrot Tree', 'Parrot Tree Plantation, building 9, second floor',
   150000, 1, 1.0, 733, 0.00, 2010, true, false, 16.3640929, -86.4130629, false,
   array['Pool', 'Gated', 'Turnkey', 'Ocean view'],
   'Second-floor unit in the same 2010 beachfront building as 9-2, with elevator access and a patio over the '
   || 'beach lagoon — 733 ft², one bed, one bath, furnished. Same community amenities: 320-foot pool, private '
   || 'white-sand beach, gated security, backup generator. Figures as published by the listing agency.',
   'Century 21 Roatan', 'MLS 25-539',
   'https://century21roatan.com/property/beachfront-condo-9-4-in-parrot-tree-plantation-roatan/', 35),

  ('sale', 'house', '2BR house in Luna Vista, Gibson Bight',
   'Gibson Bight', 'Luna Vista subdivision, Gibson Bight',
   275000, 2, 2.0, 1140, 0.08, 2025, false, false, 16.3189678, -86.5807912, true,
   array['Pool', 'Turnkey', 'Rental income'],
   'House built in 2025 in the Luna Vista subdivision at Gibson Bight, a few minutes from West End — 1,140 ft² '
   || 'on a 0.08-acre lot, two beds and two baths, sold furnished. Has a 9 × 14 ft pool, private water and sewer, '
   || 'mini-split air conditioning, paved parking, a fenced perimeter with keyless entry and solar-powered cameras. '
   || 'The agency lists it as currently operating as a vacation rental.',
   'Century 21 Roatan', 'MLS 25-638',
   'https://century21roatan.com/idx/Gibson-Bight-This-House-Has-Everything-Roatan-mls_25-638', 60),

  ('sale', 'land', '0.05 acre oceanview hilltop lot, Flowers Bay',
   'Flowers Bay', 'Hilltop above Flowers Bay',
   30000, 0, 0.0, 0, 0.05, 0, false, false, 16.2950411, -86.5699406, true,
   array['Ocean view'],
   'Small hilltop lot above Flowers Bay with ocean and jungle views, ten minutes from the airport, five from '
   || 'groceries and banking, fifteen from West Bay Beach. Access is unpaved and there is no beach frontage. '
   || 'A survey document comes with the parcel. The agency does not state the title status — on Roatán that is '
   || 'the one thing to verify in the registry before any money moves.',
   'Century 21 Roatan', 'MLS 26-192',
   'https://century21roatan.com/idx/0-053-Oceanview-Hilltop-Lot-Flowers-Bay-mls_26-192/', 90),

  ('rent', 'condo', '1BR loft at Alba Plaza, Gibson Bight — long term',
   'Gibson Bight', 'Alba Plaza, Gibson Bight',
   700, 1, 2.0, 0, 0.00, 0, false, false, 16.3189678, -86.5807912, true,
   array[]::text[],
   'One-bedroom loft with two baths at Alba Plaza, just outside West End village. $700 a month plus electricity, '
   || 'cable and internet; the manager sets a three-month minimum stay. The pin marks the area, not the exact unit.',
   'Roatan Property Management', 'Alba Plaza, Loft 1',
   'https://www.roatanpropertymanagement.com/alba-plaza-loft-1/', 120),

  ('rent', 'condo', 'Studio at Mar Vista above West Bay — long term',
   'West Bay', 'Mar Vista, hillside above West Bay',
   700, 0, 1.0, 0, 0.00, 0, false, false, 16.2751591, -86.5977278, false,
   array[]::text[],
   'Hillside studio with one bath at Mar Vista, walking distance down to West Bay Beach. $700 a month with a '
   || 'six-month minimum stay. The pin marks the area, not the exact unit.',
   'Roatan Property Management', 'Mar Vista Studio',
   'https://www.roatanpropertymanagement.com/mar-vista-studio/', 150)
) as v(deal, type, title, neighborhood, address, price, beds, baths, sqft, lot_acres, year,
       oceanfront, titled, lat, lng, featured, tags, body, source_name, source_ref, source_url, age);
