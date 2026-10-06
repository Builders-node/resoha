-- Картка контактів на сторінці обʼєкта: Viber і Telegram ріелтора та стара ціна,
-- яку показуємо закресленою, коли ціну знизили.

-- profiles: месенджери поруч з WhatsApp. Порожньо — кнопки немає.
alter table public.profiles
  add column if not exists viber    text not null default '',
  add column if not exists telegram text not null default '';

-- На profiles поколоночні гранти для аноніма (0016) — нові колонки відкриваємо явно
grant select (viber, telegram) on public.profiles to anon;

-- listings: найвища попередня ціна, поки поточна нижча. 0 — ціну не знижували.
alter table public.listings
  add column if not exists old_price numeric not null default 0;

grant select (old_price) on public.listings to anon, authenticated;

-- Стару ціну веде лише база: ріелтор міняє price, тригер запамʼятовує, з якої впала.
-- Підняли назад до старої чи вище — знижки більше немає.
create or replace function public.track_price_drop()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.price is distinct from old.price then
    if new.price < old.price then
      new.old_price := greatest(old.price, coalesce(old.old_price, 0));
    elsif new.price >= coalesce(old.old_price, 0) then
      new.old_price := 0;
    end if;
  end if;
  -- зміна угоди (продаж ↔ оренда) робить порівняння безглуздим
  if new.deal is distinct from old.deal then
    new.old_price := 0;
  end if;
  return new;
end $$;

drop trigger if exists listings_price_drop on public.listings;
create trigger listings_price_drop
  before update of price, deal on public.listings
  for each row execute function public.track_price_drop();
