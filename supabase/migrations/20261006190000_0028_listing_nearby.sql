-- Місця поблизости, які ріелтор додає руками (кафе, пляж, парк…): масив
-- {name, category, distance, unit, lat, lng}. Форму даних тримає lib/nearby.ts,
-- база стежить лише, щоб це був невеликий масив.
alter table public.listings
  add column nearby jsonb not null default '[]'::jsonb
    check (jsonb_typeof(nearby) = 'array' and jsonb_array_length(nearby) <= 20);

-- На listings діють поколоночні гранти — нову колонку відкриваємо явно
grant select (nearby) on public.listings to anon, authenticated;
grant insert (nearby), update (nearby) on public.listings to authenticated;
