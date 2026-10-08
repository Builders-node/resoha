-- Фототур, як у LUN: фото оголошення згруповані за кімнатами.
-- Ріелтор позначає кімнату для кожного фото; зберігаємо { url фото: кімната }.
-- Набір кімнат знає lib/rooms.ts, база лише зберігає.
alter table public.listings
  add column if not exists photo_rooms jsonb not null default '{}'::jsonb;

alter table public.listings drop constraint if exists listings_photo_rooms_object;
alter table public.listings add constraint listings_photo_rooms_object check (jsonb_typeof(photo_rooms) = 'object');

grant select (photo_rooms) on public.listings to anon, authenticated;
grant insert (photo_rooms), update (photo_rooms) on public.listings to authenticated;
