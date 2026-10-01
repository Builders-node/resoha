-- 1. Канал звернення: форма на сторінці чи перехід у WhatsApp.
alter table public.leads
  add column if not exists channel text not null default 'form'
  check (channel in ('form', 'whatsapp'));

-- 2. Розумні межі на рівні бази. Анонімний ключ публічний, тож API-роут можна
--    обійти прямим запитом у PostgREST — перевірки мають жити тут.
alter table public.leads drop constraint if exists leads_name_len;
alter table public.leads add constraint leads_name_len check (char_length(name) between 1 and 120);
alter table public.leads drop constraint if exists leads_phone_len;
alter table public.leads add constraint leads_phone_len check (char_length(phone) <= 40);
alter table public.leads drop constraint if exists leads_email_len;
alter table public.leads add constraint leads_email_len check (char_length(email) <= 200);
alter table public.leads drop constraint if exists leads_message_len;
alter table public.leads add constraint leads_message_len check (char_length(message) <= 2000);

-- Тригер робить дві речі: не дає підробити адресата й дату (їх раніше можна було
-- надіслати які завгодно) і стримує потік заявок на одне оголошення та з одного номера.
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

drop trigger if exists leads_guard on public.leads;
create trigger leads_guard before insert on public.leads
  for each row execute function public.leads_guard();

revoke all on function public.leads_guard() from public, anon, authenticated;

-- 3. Лічильник запитів для API-роутів (заявки, реєстрація). Таблиця закрита RLS без
--    політик: до неї дістається лише функція нижче.
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare h int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';

  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into h;

  return h <= p_max;
end $$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;
