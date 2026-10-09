-- CRM заявок: воронка зі статусами й причиною програшу, нотатки та історія (lead_events),
-- перепризначення власником агенції і round-robin для заявок на квартири ЖК.
-- Видимість заявок не змінюється: agent_id тепер означає «відповідальний ріелтор», тож
-- перепризначена заявка видна новому відповідальному й власнику агенції через ті самі
-- політики leads_read / leads_update.

-- 1. Воронка: new → contacted → viewing → offer → deal, або lost з причиною.
alter table public.leads add column if not exists lost_reason text not null default '';
alter table public.leads drop constraint if exists leads_lost_reason_len;
alter table public.leads add constraint leads_lost_reason_len check (char_length(lost_reason) <= 300);

-- «Опрацьована» тепер — будь-яка, що вийшла зі стадії new (для середнього часу відповіді)
create or replace function public.leads_handled_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status <> 'new' then
    new.handled_at := coalesce(old.handled_at, now());
  else
    new.handled_at := null;
  end if;
  return new;
end $$;
revoke all on function public.leads_handled_at() from public, anon, authenticated;

-- старі значення: new лишається new, done («опрацьована») стає contacted.
-- Без тригерів: handled_at і дата не мають зсунутись.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads disable trigger user;
update public.leads set status = 'contacted' where status = 'done';
alter table public.leads enable trigger user;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'viewing', 'offer', 'deal', 'lost'));

create index if not exists leads_agent_status_idx on public.leads (agent_id, status);

-- Сумісність: код до цієї міграції (і leads_guard для анонімного WhatsApp) пише «done».
-- Причину програшу тримаємо лише в стадії lost.
create or replace function public.leads_status_compat()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'done' then new.status := 'contacted'; end if;
  if new.status <> 'lost' then new.lost_reason := ''; end if;
  return new;
end $$;
create or replace trigger leads_status_compat before insert or update on public.leads
  for each row execute function public.leads_status_compat();
revoke all on function public.leads_status_compat() from public, anon, authenticated;

-- 2. Що можна міняти в заявці. Раніше політика leads_update пускала до будь-якої колонки,
--    зокрема agent_id. Тепер відповідального міняє лише власник агенції заявки і лише на
--    активного ріелтора цієї ж агенції; обʼєкт, агенцію, автора, канал і дату — ніхто.
create or replace function public.leads_crm_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.listing_id is distinct from old.listing_id or new.agency_id is distinct from old.agency_id
     or new.user_id is distinct from old.user_id or new.channel is distinct from old.channel
     or new.created_at is distinct from old.created_at then
    raise exception 'This field cannot be changed' using errcode = '42501';
  end if;
  if new.agent_id is distinct from old.agent_id then
    if old.agency_id is null or not public.is_agency_owner(old.agency_id) then
      raise exception 'Only the agency owner can reassign an enquiry' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.agency_members m join public.profiles p on p.id = m.profile_id
      where m.agency_id = old.agency_id and m.profile_id = new.agent_id and p.role = 'agent' and p.active
    ) then
      raise exception 'Choose an active agent of this agency' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create or replace trigger leads_crm_guard before update on public.leads
  for each row execute function public.leads_crm_guard();
revoke all on function public.leads_crm_guard() from public, anon, authenticated;

-- 3. Історія заявки: зміни стадії, нотатки, перепризначення.
create table if not exists public.lead_events (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  kind        text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  from_value  text not null default '',
  to_value    text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now(),
  constraint lead_events_kind check (kind in ('status', 'note', 'assign')),
  constraint lead_events_len check (
    char_length(body) <= 2000 and char_length(from_value) <= 100 and char_length(to_value) <= 100)
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at);
create index if not exists lead_events_actor_idx on public.lead_events (actor_id);
alter table public.lead_events enable row level security;

-- Читає той, хто веде заявку: відповідальний ріелтор, власник агенції, адмін.
-- Покупець бачить свою заявку, але не внутрішні нотатки до неї.
do $$ begin
  create policy lead_events_read on public.lead_events for select using (
    exists (select 1 from public.leads l where l.id = lead_events.lead_id
      and (l.agent_id = (select auth.uid()) or public.is_agency_owner(l.agency_id) or public.is_admin()))
  );
exception when duplicate_object then null; end $$;

-- Руками пишуть лише нотатки, від свого імені; решту подій пише тригер нижче.
do $$ begin
  create policy lead_events_note on public.lead_events for insert to authenticated with check (
    kind = 'note' and actor_id = (select auth.uid()) and from_value = '' and to_value = ''
    and exists (select 1 from public.leads l where l.id = lead_events.lead_id
      and (l.agent_id = (select auth.uid()) or public.is_agency_owner(l.agency_id)))
  );
exception when duplicate_object then null; end $$;

revoke all on public.lead_events from anon, authenticated;
grant select, insert on public.lead_events to authenticated;

create or replace function public.lead_events_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then new.created_at := now(); end if;
  return new;
end $$;
create or replace trigger lead_events_guard before insert on public.lead_events
  for each row execute function public.lead_events_guard();
revoke all on function public.lead_events_guard() from public, anon, authenticated;

-- Журнал змін заявки. Новому відповідальному — той самий лист, що й про нову заявку.
create or replace function public.leads_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    -- round-robin віддав заявку не власнику оголошення — так і запишемо
    select agent_id into v_owner from public.listings where id = new.listing_id;
    if v_owner is not null and v_owner <> new.agent_id then
      insert into public.lead_events (lead_id, kind, from_value, to_value, body)
      values (new.id, 'assign', v_owner::text, new.agent_id::text, 'Round-robin');
    end if;
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.lead_events (lead_id, kind, actor_id, from_value, to_value, body)
    values (new.id, 'status', auth.uid(), old.status, new.status,
      case when new.status = 'lost' then new.lost_reason else '' end);
  elsif new.status = 'lost' and new.lost_reason is distinct from old.lost_reason then
    insert into public.lead_events (lead_id, kind, actor_id, from_value, to_value, body)
    values (new.id, 'status', auth.uid(), old.status, new.status, new.lost_reason);
  end if;

  if new.agent_id is distinct from old.agent_id then
    insert into public.lead_events (lead_id, kind, actor_id, from_value, to_value)
    values (new.id, 'assign', auth.uid(), old.agent_id::text, new.agent_id::text);
    if new.channel <> 'whatsapp' then
      begin
        insert into public.notify_outbox (kind, user_id, payload) values ('lead_agent', new.agent_id,
          jsonb_build_object(
            'id', new.id, 'channel', new.channel, 'name', new.name, 'phone', new.phone, 'email', new.email,
            'message', new.message, 'visitAt', new.visit_at, 'interests', to_jsonb(new.interests),
            'contactVia', new.contact_via, 'listing', private.listing_card(new.listing_id)));
      exception when others then
        -- сповіщення ніколи не ламає саму зміну
        raise warning 'leads_log notify: %', sqlerrm;
      end;
    end if;
  end if;
  return null;
end $$;
create or replace trigger leads_log after insert or update on public.leads
  for each row execute function public.leads_log();
revoke all on function public.leads_log() from public, anon, authenticated;

-- 4. Round-robin для заявок на квартири ЖК агенції: по черзі між активними ріелторами
--    агенції (порядок — за датою вступу), якщо їх більше одного. Курсор — на агенцію.
create table if not exists public.lead_rr_cursor (
  agency_id   uuid primary key references public.agencies(id) on delete cascade,
  last_agent  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.lead_rr_cursor enable row level security;
revoke all on public.lead_rr_cursor from anon, authenticated;

create or replace function public.leads_round_robin()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dev uuid; v_last uuid; v_last_at timestamptz; v_next uuid; v_count int;
begin
  -- агенцію заявці вже поставив leads_guard (з оголошення); анонімний WhatsApp — лише відмітка
  if new.agency_id is null or (new.channel = 'whatsapp' and new.user_id is null) then
    return new;
  end if;
  select development_id into v_dev from public.listings where id = new.listing_id;
  if v_dev is null then return new; end if;

  select count(*) into v_count from public.agency_members m join public.profiles p on p.id = m.profile_id
  where m.agency_id = new.agency_id and p.role = 'agent' and p.active;
  if v_count < 2 then return new; end if;

  insert into public.lead_rr_cursor (agency_id) values (new.agency_id) on conflict do nothing;
  select last_agent into v_last from public.lead_rr_cursor where agency_id = new.agency_id for update;
  select joined_at into v_last_at from public.agency_members
  where agency_id = new.agency_id and profile_id = v_last;

  -- наступний після курсора; якщо курсор останній (або вибув із команди) — перший
  select m.profile_id into v_next
  from public.agency_members m join public.profiles p on p.id = m.profile_id
  where m.agency_id = new.agency_id and p.role = 'agent' and p.active
  order by (v_last_at is not null and (m.joined_at, m.profile_id) > (v_last_at, v_last)) desc,
    m.joined_at, m.profile_id
  limit 1;
  if v_next is null then return new; end if;

  update public.lead_rr_cursor set last_agent = v_next, updated_at = now() where agency_id = new.agency_id;
  new.agent_id := v_next;
  return new;
exception when others then
  -- розподіл ніколи не ламає саму заявку: тоді вона лишається власнику оголошення
  raise warning 'leads_round_robin: %', sqlerrm;
  return new;
end $$;
-- спрацьовує після leads_guard (тригери BEFORE ідуть за абеткою)
create or replace trigger leads_round_robin before insert on public.leads
  for each row execute function public.leads_round_robin();
revoke all on function public.leads_round_robin() from public, anon, authenticated;
