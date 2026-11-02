-- Спільний шар місць на карті: пляжі, дайв-сайти, школи, лікарні, пороми, аеропорти, марини.
-- Раніше місця поруч ріелтор вносив окремо в кожне оголошення (listings.nearby, 0028);
-- тепер їх веде адмін один раз, а карта й сторінка обʼєкта показують усім.
-- Видалення немає: місце ховають (active = false). Ідемпотентно, без DELETE і DROP POLICY.

create table if not exists public.map_places (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  name       text not null,
  name_es    text not null default '',
  lat        double precision not null,
  lng        double precision not null,
  note       text not null default '',
  active     boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.map_places drop constraint if exists map_places_kind;
alter table public.map_places add constraint map_places_kind
  check (kind in ('beach', 'dive', 'school', 'hospital', 'ferry', 'airport', 'marina'));
alter table public.map_places drop constraint if exists map_places_text;
alter table public.map_places add constraint map_places_text
  check (length(btrim(name)) between 1 and 120 and length(name_es) <= 120 and length(note) <= 300);
alter table public.map_places drop constraint if exists map_places_point;
alter table public.map_places add constraint map_places_point
  check (lat between -90 and 90 and lng between -180 and 180);

create index if not exists map_places_active_idx on public.map_places (kind) where active;

alter table public.map_places enable row level security;
do $$
begin
  create policy map_places_read on public.map_places for select to anon, authenticated
    using (active or (select public.is_admin()));
  create policy map_places_admin_add on public.map_places for insert to authenticated
    with check ((select public.is_admin()));
  create policy map_places_admin_edit on public.map_places for update to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));
exception when duplicate_object then null;
end $$;

grant select on public.map_places to anon, authenticated;
grant insert (kind, name, name_es, lat, lng, note, active), update (kind, name, name_es, lat, lng, note, active)
  on public.map_places to authenticated;

-- хто додав і коли міняли — ставить база, не клієнт
create or replace function public.map_places_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.map_places_stamp() from public, anon, authenticated;
create or replace trigger map_places_stamp before insert or update on public.map_places
  for each row execute function public.map_places_stamp();
