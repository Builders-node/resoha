-- Документи ЖК (земля, дозволи, введення в експлуатацію, компанії) і медіа: відео та тур 360.
alter table public.developments
  add column if not exists video text not null default '' check (length(video) <= 500),
  add column if not exists tour  text not null default '' check (length(tour) <= 500);

create table if not exists public.development_documents (
  id             uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments(id) on delete cascade,
  kind           text not null default 'other'
    check (kind in ('land', 'permit', 'environment', 'completion', 'company', 'other')),
  title          text not null check (length(title) between 1 and 120),
  number         text not null default '' check (length(number) <= 60),
  issued         text not null default '' check (length(issued) <= 40),
  file           text not null default '' check (length(file) <= 500),
  note           text not null default '' check (length(note) <= 300),
  -- «перевірено Resoha» ставить лише адмін (тригер нижче)
  verified       boolean not null default false,
  sort           int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists development_documents_dev_idx on public.development_documents (development_id, sort);

alter table public.development_documents enable row level security;

create policy development_documents_read on public.development_documents for select using (
  exists (select 1 from public.developments d where d.id = development_documents.development_id)
);
create policy development_documents_write on public.development_documents for all to authenticated
  using (exists (select 1 from public.developments d where d.id = development_documents.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())))
  with check (exists (select 1 from public.developments d where d.id = development_documents.development_id
    and (d.agent_id = (select auth.uid()) or public.is_agency_owner(d.agency_id) or public.is_admin())));

grant select on public.development_documents to anon, authenticated;
grant insert, update, delete on public.development_documents to authenticated;

-- Позначку «перевірено» не може поставити сам ріелтор: для не-адміна вона лишається як була
-- is_admin() сама security definer, тож тригеру підвищені права не потрібні
create or replace function public.development_documents_guard() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if not public.is_admin() then
    new.verified := case when tg_op = 'UPDATE' then old.verified else false end;
  end if;
  return new;
end $fn$;

drop trigger if exists development_documents_guard on public.development_documents;
create trigger development_documents_guard before insert or update on public.development_documents
  for each row execute function public.development_documents_guard();

-- Документи вантажимо PDF-ом у той самий бакет; скани бувають важкі — ліміт 20 МБ
update storage.buckets
set allowed_mime_types = array(select distinct unnest(coalesce(allowed_mime_types, '{}') || array['application/pdf'])),
    file_size_limit = greatest(coalesce(file_size_limit, 0), 20 * 1024 * 1024)
where id = 'listing-photos';
