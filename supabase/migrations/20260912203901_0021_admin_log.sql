-- Журнал дій адміністратора: досі блокування й зняття з публікації не лишали сліду.
-- Ім'я та назву цілі зберігаємо копією, щоб запис пережив видалення акаунта чи оголошення.
create table if not exists public.admin_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text not null default '',
  action      text not null,
  target_kind text not null check (target_kind in ('listing', 'profile', 'agency', 'review')),
  target_id   uuid,
  target_name text not null default '',
  reason      text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists admin_log_created_idx on public.admin_log (created_at desc);

alter table public.admin_log enable row level security;

-- Тільки читання і додавання: журнал не редагується й не чиститься через застосунок.
drop policy if exists admin_log_read on public.admin_log;
create policy admin_log_read on public.admin_log for select
  using (public.is_admin());

drop policy if exists admin_log_write on public.admin_log;
create policy admin_log_write on public.admin_log for insert to authenticated
  with check (public.is_admin() and actor_id = (select auth.uid()));

-- Адмін видаляє чуже оголошення разом із його файлами, тож потрібен доступ до бакета.
drop policy if exists listing_photos_delete on storage.objects;
create policy listing_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (owner = auth.uid() or public.is_admin()));
