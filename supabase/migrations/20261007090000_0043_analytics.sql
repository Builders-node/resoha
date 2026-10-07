-- Аналітика для ріелторів і агенцій.
-- Лічильник listings.views знав лише «скільки всього». Тепер кожна подія — окремий рядок:
-- коли, звідки прийшли, з якого пристрою, що зробили (переглянули, відкрили телефон,
-- написали в месенджер, зберегли). З них кабінет будує графіки, воронку й рейтинги.

create table if not exists public.listing_events (
  id             bigint generated always as identity primary key,
  listing_id     uuid references public.listings(id) on delete cascade,
  development_id uuid references public.developments(id) on delete cascade,
  -- власник на момент події: так фільтр «мої / вся агенція» не ходить у listings
  agent_id       uuid not null references public.profiles(id) on delete cascade,
  agency_id      uuid references public.agencies(id) on delete set null,
  kind           text not null check (kind in (
                   'view', 'dev_view', 'phone', 'whatsapp', 'viber', 'telegram', 'share', 'favorite', 'form_open')),
  source         text not null default 'direct' check (source in (
                   'direct', 'internal', 'search', 'social', 'messenger', 'other')),
  device         text not null default 'desktop' check (device in ('mobile', 'desktop')),
  -- хеш адреси + браузера + дня: рахуємо унікальних, не зберігаючи нічого особистого
  visitor        text not null default '',
  created_at     timestamptz not null default now(),
  check (listing_id is not null or development_id is not null)
);

create index if not exists listing_events_agent_idx  on public.listing_events (agent_id, created_at);
create index if not exists listing_events_agency_idx on public.listing_events (agency_id, created_at);
create index if not exists listing_events_dedupe_idx on public.listing_events (listing_id, kind, visitor, created_at);
create index if not exists listing_events_dev_idx    on public.listing_events (development_id, created_at);

alter table public.listing_events enable row level security;

-- бачать ті самі люди, що й заявки: автор, власник агенції, адмін
drop policy if exists listing_events_read on public.listing_events;
create policy listing_events_read on public.listing_events for select using (
  agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin()
);
-- писати напряму не можна нікому: лише через track_event нижче
revoke insert, update, delete on public.listing_events from anon, authenticated;

/**
 * Записати подію. Повторну таку саму подію від того ж відвідувача протягом 30 хв
 * ігноруємо — оновлення сторінки чи подвійний клік не роздувають цифри.
 * Перегляд також збільшує старий лічильник listings.views (його показують картки).
 */
create or replace function public.track_event(
  p_listing uuid, p_development uuid, p_kind text, p_source text, p_device text, p_visitor text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_agent uuid; v_agency uuid; v_dev uuid;
begin
  if p_listing is not null then
    select agent_id, agency_id, development_id into v_agent, v_agency, v_dev
      from public.listings where id = p_listing;
  elsif p_development is not null then
    select agent_id, agency_id, id into v_agent, v_agency, v_dev
      from public.developments where id = p_development;
  end if;
  if v_agent is null then return false; end if;

  if exists (
    select 1 from public.listing_events
    where kind = p_kind and visitor = coalesce(p_visitor, '')
      and listing_id is not distinct from p_listing
      and (p_listing is not null or development_id = v_dev)
      and created_at > now() - interval '30 minutes'
  ) then return false; end if;

  insert into public.listing_events (listing_id, development_id, agent_id, agency_id, kind, source, device, visitor)
  values (p_listing, v_dev, v_agent, v_agency, p_kind,
          coalesce(p_source, 'direct'), coalesce(p_device, 'desktop'), left(coalesce(p_visitor, ''), 64));

  if p_kind = 'view' then
    update public.listings set views = views + 1 where id = p_listing;
  end if;
  return true;
end $$;

revoke all on function public.track_event(uuid, uuid, text, text, text, text) from public;
grant execute on function public.track_event(uuid, uuid, text, text, text, text) to anon, authenticated;

-- Коли заявку обробили — для «середнього часу відповіді». Ставить тригер, не клієнт.
alter table public.leads add column if not exists handled_at timestamptz;

create or replace function public.leads_handled_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'done' then
    new.handled_at := coalesce(old.handled_at, now());
  else
    new.handled_at := null;
  end if;
  return new;
end $$;

drop trigger if exists leads_handled_at on public.leads;
create trigger leads_handled_at before update on public.leads
  for each row execute function public.leads_handled_at();
revoke all on function public.leads_handled_at() from public, anon, authenticated;
