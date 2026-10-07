-- Запис на візит у відділ продажів ЖК, як у LUN: графік роботи по днях і заявка
-- з датою й часом візиту, темами та зручним способом звʼязку.

-- 1. Графік відділу продажів: 7 днів з понеділка, кожен — {"open":"10:00","close":"19:00"} або null.
--    Порожній масив — графік не задано (тоді показуємо старий вільний текст hours).
alter table public.developments
  add column if not exists schedule jsonb not null default '[]'::jsonb;
alter table public.developments drop constraint if exists developments_schedule_shape;
alter table public.developments add constraint developments_schedule_shape
  check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) in (0, 7));

-- 2. Заявка на візит: новий канал і три поля
alter table public.leads drop constraint if exists leads_channel_check;
alter table public.leads add constraint leads_channel_check check (channel in ('form', 'whatsapp', 'visit'));
alter table public.leads
  add column if not exists visit_at    timestamptz,
  add column if not exists interests   text[] not null default '{}',
  add column if not exists contact_via text not null default '';
alter table public.leads drop constraint if exists leads_interests_len;
alter table public.leads add constraint leads_interests_len check (cardinality(interests) <= 30);
alter table public.leads drop constraint if exists leads_contact_via;
alter table public.leads add constraint leads_contact_via check (contact_via in ('', 'phone', 'whatsapp', 'email'));

create index if not exists leads_visit_idx on public.leads (agent_id, visit_at) where visit_at is not null;

-- 3. Той самий тригер, що в 0023, плюс: візит лише в майбутньому і не далі ніж за 90 днів.
--    Слоти графіка перевіряє API; тут — межа, яку не обійти прямим запитом у PostgREST.
create or replace function public.leads_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner record;
begin
  select agent_id, agency_id into owner from public.listings where id = new.listing_id;
  if not found then
    raise exception 'Listing not found';
  end if;

  new.agent_id   := owner.agent_id;
  new.agency_id  := owner.agency_id;
  new.created_at := now();
  -- анонімний перехід у WhatsApp — це відмітка «хтось написав», а не заявка, що чекає відповіді
  new.status := case when new.channel = 'whatsapp' and new.user_id is null then 'done' else 'new' end;

  if new.channel = 'visit' then
    if new.visit_at is null or new.visit_at < now() or new.visit_at > now() + interval '90 days' then
      raise exception 'Pick a visit time from the schedule';
    end if;
  else
    new.visit_at := null;
  end if;

  if (select count(*) from public.leads
      where listing_id = new.listing_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many enquiries for this listing right now. Please try again later.';
  end if;

  if new.phone <> '' and (select count(*) from public.leads
      where phone = new.phone and created_at > now() - interval '1 day') >= 6 then
    raise exception 'Too many enquiries from this number today.';
  end if;

  return new;
end $$;

revoke all on function public.leads_guard() from public, anon, authenticated;
