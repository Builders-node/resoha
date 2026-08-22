create or replace function public.is_agency_owner(a uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select p.is_owner and p.agency_id = a
    from public.profiles p where p.id = auth.uid()
  ), false);
$$;

create or replace function public.my_agency()
returns uuid language sql security definer stable set search_path = public as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, phone, whatsapp, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'https://picsum.photos/seed/resoha-' || replace(new.id::text, '-', '') || '/200/200'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.enforce_owner_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_owner and not new.is_owner and old.agency_id is not null then
    if (select count(*) from public.profiles
        where agency_id = old.agency_id and is_owner and id <> old.id) = 0 then
      raise exception 'The agency needs at least one owner';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_owner_guard on public.profiles;
create trigger profiles_owner_guard
  before update on public.profiles
  for each row execute function public.enforce_owner_rules();

alter table public.agencies       enable row level security;
alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.leads          enable row level security;
alter table public.saved_searches enable row level security;
alter table public.favorites      enable row level security;

drop policy if exists agencies_read on public.agencies;
create policy agencies_read on public.agencies for select using (true);

drop policy if exists agencies_update on public.agencies;
create policy agencies_update on public.agencies for update
  using (public.is_agency_owner(id)) with check (public.is_agency_owner(id));

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (role = 'agent' or id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_agency_owner(agency_id))
  with check (id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select
  using (active or agent_id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert
  with check (agent_id = auth.uid());

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update
  using (agent_id = auth.uid() or public.is_agency_owner(agency_id))
  with check (agent_id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete
  using (agent_id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert with check (true);

drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select
  using (agent_id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update
  using (agent_id = auth.uid() or public.is_agency_owner(agency_id));

drop policy if exists saved_own on public.saved_searches;
create policy saved_own on public.saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
