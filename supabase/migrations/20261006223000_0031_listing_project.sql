-- Дані про новобудову для оголошень з юнітами: забудовник, термін здачі,
-- стан продажів, сайт. Форму даних тримає lib/units.ts (cleanProject).
alter table public.listings
  add column project jsonb not null default '{}'::jsonb
    check (jsonb_typeof(project) = 'object');

-- На listings діють поколоночні гранти — нову колонку відкриваємо явно
grant select (project) on public.listings to anon, authenticated;
grant insert (project), update (project) on public.listings to authenticated;
