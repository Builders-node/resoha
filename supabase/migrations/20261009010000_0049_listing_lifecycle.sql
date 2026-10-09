-- Життєвий цикл оголошення: чернетка → перевірка → опубліковано (або відхилено),
-- строк показу 90 днів із продовженням, підозра на дубль і скарги покупців.

-- 1. Колонки. Усе, що вже є в базі, вважаємо перевіреним.
alter table public.listings
  add column if not exists review             text not null default 'approved',
  add column if not exists review_note        text not null default '',
  add column if not exists duplicate_of       uuid references public.listings(id) on delete set null,
  add column if not exists published_at       timestamptz,
  add column if not exists expires_at         timestamptz,
  add column if not exists expiry_notified_at timestamptz;
alter table public.listings drop constraint if exists listings_review_check;
alter table public.listings add constraint listings_review_check
  check (review in ('draft', 'pending', 'approved', 'rejected'));
alter table public.listings drop constraint if exists listings_review_note_len;
alter table public.listings add constraint listings_review_note_len check (char_length(review_note) <= 500);

-- бекфіл без тригерів: інакше touch_listing позначив би всі оголошення «оновленими сьогодні»
alter table public.listings disable trigger user;
update public.listings set published_at = created_at where published_at is null and review = 'approved';
-- квартири ЖК живуть, поки їх продає забудовник; строк — лише в окремих оголошень
update public.listings set expires_at = now() + interval '90 days'
  where development_id is null and expires_at is null;
alter table public.listings enable trigger user;

create index if not exists listings_review_idx on public.listings (review) where review <> 'approved';
create index if not exists listings_expires_idx on public.listings (expires_at) where expires_at is not null;
create index if not exists listings_duplicate_of_idx on public.listings (duplicate_of) where duplicate_of is not null;

-- 2. Публічно видно лише перевірене й не прострочене. Автор, власник агенції й адмін бачать усе своє.
alter policy listings_read on public.listings using (
  (active and review = 'approved' and (expires_at is null or expires_at > now())
    and exists (select 1 from public.profiles p where p.id = listings.agent_id and p.active))
  or agent_id = (select auth.uid()) or public.is_agency_owner(agency_id) or public.is_admin()
);

-- 3. Хто що може змінити. Не security definer: потрібен справжній current_user, як у listings_guard.
create or replace function public.listings_review()
returns trigger language plpgsql set search_path = public as $$
declare
  v_user    boolean := current_user in ('authenticated', 'anon') and not public.is_admin();
  v_trusted boolean;
  v_dup     uuid;
  v_submit  boolean;
begin
  if v_user then
    -- перевірений ріелтор публікує одразу, решта — через модерацію
    v_trusted := coalesce((select verified from public.profiles where id = new.agent_id), false);
    if tg_op = 'INSERT' then
      new.review := case when new.review = 'draft' then 'draft' when v_trusted then 'approved' else 'pending' end;
      new.review_note := '';
      new.duplicate_of := null;
      new.published_at := null;
      new.expires_at := null;
      new.expiry_notified_at := null;
    else
      new.review_note := old.review_note;
      new.duplicate_of := old.duplicate_of;
      new.published_at := old.published_at;
      new.expiry_notified_at := old.expiry_notified_at;
      if new.review is distinct from old.review then
        if new.review = 'draft' then
          null;                                   -- зняти в чернетку можна завжди
        elsif new.review in ('pending', 'approved') then
          new.review := case when v_trusted then 'approved' else 'pending' end;
          new.review_note := '';
        else
          new.review := old.review;               -- відхиляє лише адмін
        end if;
      end if;
      -- продовження опублікованого: не далі ніж на 90 днів від сьогодні
      if new.expires_at is distinct from old.expires_at then
        if new.expires_at is null or new.expires_at <= now() or old.expires_at is null
           or old.review <> 'approved' or old.development_id is not null then
          new.expires_at := old.expires_at;
        else
          new.expires_at := least(new.expires_at, now() + interval '90 days');
        end if;
      end if;
    end if;
  end if;

  v_submit := new.review in ('pending', 'approved')
    and (tg_op = 'INSERT' or old.review in ('draft', 'rejected'));

  -- Дубль: той самий тип угоди й обʼєкта поруч (до ~60 м) з ціною ±5%, або спільне фото.
  -- Типова точка «без координат» (16.3, -86.59) за збіг місця не рахується.
  if v_submit and new.development_id is null then
    select l.id into v_dup from public.listings l
    where l.id <> new.id and l.development_id is null and l.review <> 'rejected'
      and l.deal = new.deal and l.type = new.type
      and (
        (abs(l.lat - new.lat) < 0.0006 and abs(l.lng - new.lng) < 0.0006
          and not (new.lat = 16.3 and new.lng = -86.59)
          and l.price between new.price * 0.95 and new.price * 1.05)
        or (cardinality(new.photos) > 0 and l.photos && new.photos)
      )
    order by l.created_at limit 1;
    if v_dup is not null then
      new.duplicate_of := v_dup;
      if v_user then new.review := 'pending'; end if;
    end if;
  end if;

  -- Публікація: дата першого показу і строк для окремих оголошень
  if new.review = 'approved' then
    new.published_at := coalesce(new.published_at, now());
    if new.development_id is null and (new.expires_at is null or new.expires_at <= now())
       and (tg_op = 'INSERT' or old.review <> 'approved') then
      new.expires_at := now() + interval '90 days';
    end if;
  end if;
  if new.development_id is not null then new.expires_at := null; end if;
  if tg_op = 'UPDATE' and new.expires_at is distinct from old.expires_at then
    new.expiry_notified_at := null;
  end if;
  return new;
end $$;

create or replace trigger listings_review before insert or update on public.listings
  for each row execute function public.listings_review();
revoke all on function public.listings_review() from public, anon, authenticated;

-- 4. Скарги на оголошення. Пише будь-хто (як заявку), читає й закриває адмін.
create table if not exists public.listing_reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  reason      text not null,
  message     text not null default '',
  email       text not null default '',
  user_id     uuid references public.profiles(id) on delete set null,
  status      text not null default 'open',
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references public.profiles(id) on delete set null,
  constraint listing_reports_reason check (reason in ('sold', 'wrong_price', 'wrong_info', 'photos', 'scam', 'duplicate', 'other')),
  constraint listing_reports_status check (status in ('open', 'resolved', 'dismissed')),
  constraint listing_reports_len check (char_length(message) <= 2000 and char_length(email) <= 200)
);
create index if not exists listing_reports_listing_idx on public.listing_reports (listing_id);
create index if not exists listing_reports_open_idx on public.listing_reports (created_at) where status = 'open';
create index if not exists listing_reports_user_idx on public.listing_reports (user_id);
create index if not exists listing_reports_handled_by_idx on public.listing_reports (handled_by);
alter table public.listing_reports enable row level security;

do $$ begin
  create policy listing_reports_insert on public.listing_reports for insert
  with check (user_id is null or user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy listing_reports_admin on public.listing_reports for select using (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy listing_reports_update on public.listing_reports for update using (public.is_admin());
exception when duplicate_object then null; end $$;

-- прямий запит у PostgREST не обходить меж: статус новий, не більше 5 скарг на обʼєкт за годину
create or replace function public.listing_reports_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open';
    new.created_at := now();
    new.handled_at := null;
    new.handled_by := null;
    if (select count(*) from public.listing_reports
        where listing_id = new.listing_id and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'This listing has already been reported. Thank you.';
    end if;
  elsif new.status is distinct from old.status then
    new.handled_at := case when new.status = 'open' then null else now() end;
    new.handled_by := case when new.status = 'open' then null else auth.uid() end;
  end if;
  return new;
end $$;
create or replace trigger listing_reports_guard before insert or update on public.listing_reports
  for each row execute function public.listing_reports_guard();
revoke all on function public.listing_reports_guard() from public, anon, authenticated;

grant insert on public.listing_reports to anon, authenticated;
grant select, update on public.listing_reports to authenticated;
