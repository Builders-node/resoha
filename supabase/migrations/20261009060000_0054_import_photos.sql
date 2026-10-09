-- Імпорт оголошень (CSV / фід Kyero v3), до 50 фото на оголошення
-- і прайс забудовника з оновленням квартир за номером в одній транзакції.

-- 1. Код обʼєкта в системі агенції: за ним повторний імпорт оновлює, а не дублює.
--    Унікальний у межах ріелтора; порожній — оголошення заведене вручну.
alter table public.listings add column if not exists external_id text not null default '';
alter table public.listings drop constraint if exists listings_external_id_len;
alter table public.listings add constraint listings_external_id_len check (char_length(external_id) <= 120);
create unique index if not exists listings_agent_external_idx
  on public.listings (agent_id, external_id) where external_id <> '';
grant select (external_id) on public.listings to anon, authenticated;
grant insert (external_id), update (external_id) on public.listings to authenticated;

-- 2. Фото: було до 12 (лише в інтерфейсі й /api/uploads), тепер до 50.
--    not valid — старі рядки не перевіряємо, обмеження діє на нові записи.
alter table public.listings drop constraint if exists listings_photos_max;
alter table public.listings add constraint listings_photos_max check (cardinality(photos) <= 50) not valid;

-- 3. Прайс забудовника одним запитом: нові квартири вставляються, наявні (за номером,
--    зіставлені на сервері) оновлюються. Не security definer: працюють RLS і тригери
--    listings_guard / listings_review, як при звичайному збереженні. Будь-яка помилка
--    відкочує весь прайс.
create or replace function public.apply_price_list(
  p_development uuid,
  p_building    uuid,
  p_deal        text,
  p_new         jsonb,
  p_changes     jsonb
) returns jsonb
language plpgsql set search_path = public as $$
declare
  v_dev     public.developments%rowtype;
  v_address text;
  v_agent   uuid;
  v_row     jsonb;
  v_beds    int;
  v_created int := 0;
  v_updated int := 0;
begin
  select * into v_dev from public.developments where id = p_development;
  if not found then
    raise exception 'Development not found' using errcode = '42501';
  end if;
  -- як canManageDevelopment у застосунку: автор ЖК, власник його агенції або адмін
  if not (public.is_admin() or v_dev.agent_id = auth.uid() or public.is_agency_owner(v_dev.agency_id)) then
    raise exception 'Not your development' using errcode = '42501';
  end if;
  v_address := v_dev.address;
  if p_building is not null then
    select coalesce(nullif(b.address, ''), v_dev.address) into v_address
      from public.buildings b where b.id = p_building and b.development_id = p_development;
    if not found then
      raise exception 'Building is not in this development' using errcode = '22023';
    end if;
  end if;
  -- адмін записує квартири на автора ЖК, решта — на себе (RLS listings_insert)
  v_agent := case when public.is_admin() then v_dev.agent_id else auth.uid() end;

  for v_row in select * from jsonb_array_elements(coalesce(p_new, '[]'::jsonb)) loop
    v_beds := coalesce((v_row->>'beds')::int, 0);
    insert into public.listings (
      agent_id, agency_id, deal, type, title, island, neighborhood, address,
      price, beds, baths, sqft, lat, lng, photos, body, titled,
      development_id, building_id, unit_no, floor, status
    ) values (
      v_agent, v_dev.agency_id, case when p_deal = 'rent' then 'rent' else 'sale' end, 'condo',
      v_dev.name || ' · Unit ' || (v_row->>'unit') || ' · '
        || case when v_beds > 0 then v_beds || ' Bedroom' else 'Studio' end,
      v_dev.island, v_dev.neighborhood, v_address,
      (v_row->>'price')::numeric, v_beds, 0, coalesce((v_row->>'sqft')::numeric, 0),
      v_dev.lat, v_dev.lng, v_dev.photos[1:50], v_dev.body, false,
      p_development, p_building, left(v_row->>'unit', 20), (v_row->>'floor')::int,
      coalesce(nullif(v_row->>'status', ''), 'available')
    );
    v_created := v_created + 1;
  end loop;

  for v_row in select * from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb)) loop
    update public.listings l set
      price  = coalesce((v_row->>'price')::numeric, l.price),
      beds   = coalesce((v_row->>'beds')::int, l.beds),
      sqft   = coalesce((v_row->>'sqft')::numeric, l.sqft),
      floor  = case when v_row ? 'floor' then (v_row->>'floor')::int else l.floor end,
      status = coalesce(nullif(v_row->>'status', ''), l.status),
      title  = coalesce(nullif(v_row->>'title', ''), l.title)
    where l.id = (v_row->>'id')::uuid and l.development_id = p_development;
    if not found then
      raise exception 'Unit % could not be updated', v_row->>'unit' using errcode = '42501';
    end if;
    v_updated := v_updated + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated);
end $$;

revoke all on function public.apply_price_list(uuid, uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.apply_price_list(uuid, uuid, text, jsonb, jsonb) to authenticated;
