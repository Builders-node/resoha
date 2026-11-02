-- Етап 3, покупці.
-- 1. Відео й 3D-тур у звичайних оголошеннях (як у ЖК з 0039): посилання на YouTube / Vimeo / Matterport / Kuula.
--    has_media — для фільтра «є відео або тур» і значка на картці.
-- 2. Запис на перегляд вторинки на вільний слот, як у ЖК: години показів ріелтора (profiles.viewing_schedule),
--    зайняті слоти — по ріелтору, а не по одному обʼєкту (він не може бути у двох місцях одночасно).
--    Сама заявка — та сама leads.channel = 'visit' з 0047/0055: підтвердження, .ics, нагадування, перенесення.
-- Ідемпотентно, без DELETE і DROP POLICY.

/* ---------- 1. відео й тур ---------- */
alter table public.listings
  add column if not exists video text not null default '',
  add column if not exists tour  text not null default '';

alter table public.listings drop constraint if exists listings_video_url;
alter table public.listings add constraint listings_video_url
  check (video = '' or (video ~* '^https?://' and length(video) <= 500));
alter table public.listings drop constraint if exists listings_tour_url;
alter table public.listings add constraint listings_tour_url
  check (tour = '' or (tour ~* '^https?://' and length(tour) <= 500));

alter table public.listings
  add column if not exists has_media boolean generated always as (video <> '' or tour <> '') stored;
create index if not exists listings_has_media_idx on public.listings (has_media) where has_media;

grant select (video, tour, has_media) on public.listings to anon, authenticated;
grant insert (video, tour), update (video, tour) on public.listings to authenticated;

/* ---------- 2. години показів ріелтора ---------- */
-- [] — ріелтор не задавав: сайт показує типові години (пн–сб 9:00–17:00).
-- viewing_slots = false — ріелтор вимкнув запис на слот, лишається звичайна форма.
alter table public.profiles
  add column if not exists viewing_schedule jsonb not null default '[]'::jsonb,
  add column if not exists viewing_slots boolean not null default true;
alter table public.profiles drop constraint if exists profiles_viewing_schedule_shape;
alter table public.profiles add constraint profiles_viewing_schedule_shape
  check (jsonb_typeof(viewing_schedule) = 'array' and jsonb_array_length(viewing_schedule) in (0, 7));

grant select (viewing_schedule, viewing_slots) on public.profiles to anon;

/**
 * Та сама перевірка, що в 0055, але для обʼєкта поза ЖК слот рахуємо по ріелтору:
 * два покупці не можуть записатись до одного ріелтора на той самий час на різні будинки.
 */
create or replace function private.visit_check(p_listing uuid, p_at timestamptz, p_exclude uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_dev uuid; v_agent uuid; v_cap int; v_off date[]; v_n int;
begin
  select l.development_id, l.agent_id, coalesce(d.visit_capacity, 1), coalesce(d.blackout_dates, '{}')
    into v_dev, v_agent, v_cap, v_off
  from public.listings l left join public.developments d on d.id = l.development_id
  where l.id = p_listing;

  perform pg_advisory_xact_lock(hashtext('visit:' || coalesce(v_dev, v_agent, p_listing)::text));

  if (p_at at time zone 'America/Tegucigalpa')::date = any (v_off) then
    raise exception 'The sales office is closed on this day. Please pick another one.';
  end if;

  select count(*) into v_n
  from public.leads x
  join public.listings xl on xl.id = x.listing_id
  left join public.visit_bookings b on b.lead_id = x.id
  where x.channel = 'visit' and x.visit_at = p_at
    and (p_exclude is null or x.id <> p_exclude)
    and coalesce(b.status, 'booked') <> 'cancelled'
    and (case when v_dev is not null then xl.development_id = v_dev
              else xl.development_id is null and x.agent_id = v_agent end);
  if v_n >= v_cap then
    raise exception 'This time is no longer available. Please pick another one.';
  end if;
end $$;
revoke all on function private.visit_check(uuid, timestamptz, uuid) from public, anon, authenticated;

/** Зайняті слоти ріелтора на перегляди вторинки, 90 днів уперед. Лише час і кількість, без імен. */
create or replace function public.agent_visit_busy(p_agent uuid)
returns table (visit_at timestamptz, booked int)
language sql stable security definer set search_path = public as $$
  select x.visit_at, count(*)::int
  from public.leads x
  join public.listings xl on xl.id = x.listing_id
  left join public.visit_bookings b on b.lead_id = x.id
  where x.agent_id = p_agent and xl.development_id is null and x.channel = 'visit'
    and x.visit_at > now() and x.visit_at < now() + interval '91 days'
    and coalesce(b.status, 'booked') <> 'cancelled'
  group by x.visit_at
$$;
revoke all on function public.agent_visit_busy(uuid) from public;
grant execute on function public.agent_visit_busy(uuid) to anon, authenticated;

/**
 * Картка запису за токеном (0055) плюс для вторинки — ріелтор, його години показів і адреса обʼєкта,
 * щоб покупець міг перенести перегляд за посиланням із листа.
 */
create or replace function public.visit_lookup(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'leadId', l.id, 'status', b.status, 'cancelledBy', b.cancelled_by, 'visitAt', l.visit_at,
    'name', l.name, 'listing', private.listing_card(l.listing_id),
    'development', case when d.id is null then null else jsonb_build_object(
      'id', d.id, 'name', d.name, 'slug', d.slug, 'schedule', d.schedule, 'capacity', d.visit_capacity,
      'blackout', to_jsonb(d.blackout_dates), 'office', d.office, 'address', d.address,
      'neighborhood', d.neighborhood, 'hours', d.hours) end,
    'viewing', case when d.id is null and li.id is not null then jsonb_build_object(
      'agentId', li.agent_id,
      'schedule', (select p.viewing_schedule from public.profiles p where p.id = li.agent_id),
      'address', li.address, 'neighborhood', li.neighborhood) end,
    'agent', (select jsonb_build_object('name', p.name, 'phone', p.phone, 'whatsapp', p.whatsapp)
              from public.profiles p where p.id = l.agent_id))
  from public.visit_bookings b
  join public.leads l on l.id = b.lead_id
  left join public.listings li on li.id = l.listing_id
  left join public.developments d on d.id = li.development_id
  where p_token is not null and length(p_token) >= 32 and b.token = p_token
$$;
revoke all on function public.visit_lookup(text) from public;
grant execute on function public.visit_lookup(text) to anon, authenticated;
