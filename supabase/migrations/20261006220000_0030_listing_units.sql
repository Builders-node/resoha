-- Квартири в одному будинку (новобудова, кондо-комплекс): масив
-- {unit, beds, floor, m2, sqft, price, status}. Форму даних тримає lib/units.ts,
-- база стежить лише, щоб це був масив розумного розміру.
alter table public.listings
  add column units jsonb not null default '[]'::jsonb
    check (jsonb_typeof(units) = 'array' and jsonb_array_length(units) <= 300);

-- На listings діють поколоночні гранти — нову колонку відкриваємо явно
grant select (units) on public.listings to anon, authenticated;
grant insert (units), update (units) on public.listings to authenticated;
