-- Забудовник — окрема сутність зі своєю сторінкою (/developers/<slug>). ЖК посилається
-- на нього через developer_id. Стару текстову колонку developments.developer лишаємо
-- дзеркалом назви: усі сторінки ЖК, що її показують, працюють без змін.
-- Профіль забудовника створює будь-який залогінений акаунт і веде його сам;
-- «перевірено» ставить лише адмін.

create table if not exists public.developers (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (length(name) between 1 and 120),
  logo       text not null default '',
  about      text not null default '' check (length(about) <= 4000),
  website    text not null default '',
  phone      text not null default '' check (length(phone) <= 40),
  email      text not null default '' check (length(email) <= 120),
  founded    int check (founded between 1900 and 2100),
  owner_id   uuid references public.profiles(id) on delete set null,
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists developers_owner_idx on public.developers (owner_id);

alter table public.developers enable row level security;

drop policy if exists developers_read on public.developers;
create policy developers_read on public.developers for select using (true);
drop policy if exists developers_insert on public.developers;
create policy developers_insert on public.developers for insert to authenticated
  with check (owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists developers_update on public.developers;
create policy developers_update on public.developers for update
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists developers_delete on public.developers;
create policy developers_delete on public.developers for delete
  using (owner_id = (select auth.uid()) or public.is_admin());

grant select on public.developers to anon, authenticated;
grant insert, update, delete on public.developers to authenticated;

-- власника, «перевірено» й дату міняє лише адмін
create or replace function public.developers_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.verified := false;
    new.created_at := now();
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id or new.verified is distinct from old.verified
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin can change this' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists developers_guard on public.developers;
create trigger developers_guard before insert or update on public.developers
  for each row execute function public.developers_guard();

-- ЖК → забудовник
alter table public.developments
  add column if not exists developer_id uuid references public.developers(id) on delete set null;
create index if not exists developments_developer_idx on public.developments (developer_id);

-- назва в developments.developer завжди відповідає обраному забудовнику
create or replace function public.developments_developer_name()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.developer_id is not null then
    new.developer := coalesce((select name from public.developers where id = new.developer_id), new.developer);
  end if;
  return new;
end $$;

drop trigger if exists developments_developer_name on public.developments;
create trigger developments_developer_name before insert or update of developer_id, developer on public.developments
  for each row execute function public.developments_developer_name();

-- забудовник перейменувався — оновлюємо назву в усіх його ЖК, навіть чужих агенцій
create or replace function public.developers_rename()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.developments set developer = new.name
   where developer_id = new.id and developer is distinct from new.name;
  return null;
end $$;
revoke all on function public.developers_rename() from public, anon, authenticated;

drop trigger if exists developers_rename on public.developers;
create trigger developers_rename after update of name on public.developers
  for each row execute function public.developers_rename();

-- Забудовники, що вже записані текстом у ЖК (Darien Village Development тощо), стають
-- профілями. Власник — автор найстарішого такого ЖК; адмін може передати профіль забудовнику.
insert into public.developers (slug, name, owner_id, created_at)
select distinct on (lower(trim(d.developer)))
       trim(both '-' from regexp_replace(lower(trim(d.developer)), '[^a-z0-9]+', '-', 'g')),
       trim(d.developer), d.agent_id, d.created_at
  from public.developments d
 where trim(d.developer) <> ''
   and trim(both '-' from regexp_replace(lower(trim(d.developer)), '[^a-z0-9]+', '-', 'g')) <> ''
 order by lower(trim(d.developer)), d.created_at
on conflict (slug) do nothing;

update public.developments d
   set developer_id = v.id
  from public.developers v
 where d.developer_id is null and lower(trim(d.developer)) = lower(v.name);
