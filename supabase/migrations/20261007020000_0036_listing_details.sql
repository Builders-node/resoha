-- Сторінка обʼєкта як у LUN: повна таблиця характеристик, історія ціни
-- і дата, коли оголошення востаннє оновлювали.

-- 1. Характеристики: стан, меблі, стіни, паркінг, кондиціонер, вода, світло…
--    Одна jsonb-колонка: набір полів знає lib/details.ts, база лише зберігає.
alter table public.listings
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.listings drop constraint if exists listings_details_object;
alter table public.listings add constraint listings_details_object check (jsonb_typeof(details) = 'object');

-- 2. Коли оголошення востаннє міняли. Перегляди (views) — не зміна оголошення.
alter table public.listings
  add column if not exists updated_at timestamptz;
update public.listings set updated_at = created_at where updated_at is null;
alter table public.listings alter column updated_at set default now();
alter table public.listings alter column updated_at set not null;

grant select (details, updated_at) on public.listings to anon, authenticated;

create or replace function public.touch_listing()
returns trigger language plpgsql set search_path = public as $$
begin
  if (to_jsonb(new) - 'views' - 'updated_at') is distinct from (to_jsonb(old) - 'views' - 'updated_at') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists listings_touch on public.listings;
create trigger listings_touch
  before update on public.listings
  for each row execute function public.touch_listing();

-- 3. Історія ціни: кожна зміна ціни чи угоди — рядок. Пише лише тригер.
create table if not exists public.listing_prices (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  price numeric not null,
  deal text not null,
  changed_at timestamptz not null default now()
);
create index if not exists listing_prices_listing_idx on public.listing_prices (listing_id, changed_at);

alter table public.listing_prices enable row level security;

-- бачить той, хто бачить саме оголошення (RLS listings спрацює всередині exists)
drop policy if exists listing_prices_read on public.listing_prices;
create policy listing_prices_read on public.listing_prices
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

revoke all on public.listing_prices from anon, authenticated;
grant select on public.listing_prices to anon, authenticated;

create or replace function public.log_listing_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price or new.deal is distinct from old.deal then
    insert into public.listing_prices (listing_id, price, deal) values (new.id, new.price, new.deal);
  end if;
  return null;
end $$;
revoke execute on function public.log_listing_price() from public, anon, authenticated;

drop trigger if exists listings_price_log on public.listings;
create trigger listings_price_log
  after insert or update of price, deal on public.listings
  for each row execute function public.log_listing_price();

-- Стартова історія для наявних оголошень: ціна на день публікації.
-- Якщо ціну вже знижували (old_price з 0034), спершу стара ціна, потім поточна.
insert into public.listing_prices (listing_id, price, deal, changed_at)
select l.id, case when coalesce(l.old_price, 0) > 0 then l.old_price else l.price end, l.deal, l.created_at
from public.listings l
where not exists (select 1 from public.listing_prices p where p.listing_id = l.id);

insert into public.listing_prices (listing_id, price, deal, changed_at)
select l.id, l.price, l.deal, now()
from public.listings l
where coalesce(l.old_price, 0) > 0
  and (select count(*) from public.listing_prices p where p.listing_id = l.id) = 1;
