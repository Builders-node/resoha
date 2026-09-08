-- Провенанс оголошення: звідки взяті факти. Порожній рядок — оголошення завів сам ріелтор.
alter table public.listings
  add column if not exists source_name text not null default '',
  add column if not exists source_url  text not null default '',
  add column if not exists source_ref  text not null default '';

-- На listings діють поколоночні гранти, тож нові колонки треба відкрити явно,
-- інакше і публічне читання, і select('*') під логіном мовчки ламаються.
grant select (source_name, source_url, source_ref) on public.listings to anon, authenticated;
grant insert (source_name, source_url, source_ref) on public.listings to authenticated;
grant update (source_name, source_url, source_ref) on public.listings to authenticated;
