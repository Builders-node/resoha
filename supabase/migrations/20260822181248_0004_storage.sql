insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listing_photos_read on storage.objects;
create policy listing_photos_read on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists listing_photos_insert on storage.objects;
create policy listing_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists listing_photos_update on storage.objects;
create policy listing_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid());

drop policy if exists listing_photos_delete on storage.objects;
create policy listing_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid());
