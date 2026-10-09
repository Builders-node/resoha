-- Пошук каталогу: виправлення опечаток (триграми) і сортування «ціна за ft²» / «подешевшали».
-- Аналітика пошуку: набір тексту в полі — один запис, а не по запису на кожну паузу.

create extension if not exists pg_trgm with schema extensions;

-- 1. Сортування, яке PostgREST не вміє рахувати сам — збережені обчислювані колонки
alter table public.listings
  add column if not exists price_per_sqft numeric
    generated always as (case when sqft > 0 and price > 0 then round(price / sqft, 2) end) stored,
  add column if not exists price_cut_pct numeric
    generated always as (case when old_price > price and old_price > 0 then round((old_price - price) * 100 / old_price, 2) end) stored;
create index if not exists listings_price_cut_idx on public.listings (price_cut_pct) where price_cut_pct is not null;

-- 2. Текст для пошуку: назва, адреса, район, острів; наголоси не важать («roatan» = «Roatán»). Опис — лише точним входженням: він довгий і шумний.
/**
 * Виправлення опечаток. Каталог шукає кожне слово запиту через ilike; слово, якого
 * немає в жодному оголошенні, тут замінюємо найсхожим словом із назв, адрес і районів
 * («wesbay» → «west», «sandi» → «sandy», «roatan» → «roatán»). Без схожого — лишаємо як є.
 * Не security definer: RLS лишається, тож словник — лише з того, що людина й так бачить.
 */
create or replace function public.search_terms(p_q text)
returns text[] language sql stable set search_path = public, extensions as $$
  with words as (
    select w, min(n) n from unnest(regexp_split_to_array(lower(trim(left(coalesce(p_q, ''), 120))), '\s+'))
      with ordinality as t(w, n)
    where w <> '' group by w
  ), hay as (
    select lower(l.title || ' ' || l.address || ' ' || l.neighborhood || ' ' || l.island || ' ' || l.body) as txt,
           lower(l.title || ' ' || l.address || ' ' || l.neighborhood || ' ' || l.island) as short
    from public.listings l
  ), vocab as (
    select distinct v from hay, unnest(regexp_split_to_array(hay.short, '[^[:alnum:]]+')) v
    where char_length(v) >= 3
  )
  select coalesce(array_agg(fixed order by n), '{}') from (
    select words.n, case
      when char_length(words.w) < 4 or exists (select 1 from hay where strpos(hay.txt, words.w) > 0) then words.w
      else coalesce((
        select v from vocab
        where similarity(translate(v, 'áéíóúñü', 'aeiounu'), translate(words.w, 'áéíóúñü', 'aeiounu')) >= 0.3
        order by similarity(translate(v, 'áéíóúñü', 'aeiounu'), translate(words.w, 'áéíóúñü', 'aeiounu')) desc, v
        limit 1), words.w)
    end as fixed
    from words
  ) f
$$;
revoke all on function public.search_terms(text) from public;
grant execute on function public.search_terms(text) to anon, authenticated;

-- 3. Аналітика: той самий відвідувач допечатує або стирає текст (за хвилину, решта фільтрів та сама) —
--    оновлюємо його останній запис, а не додаємо новий.
create or replace function public.track_search(
  p_deal text, p_type text, p_areas text[], p_price_min numeric, p_price_max numeric,
  p_beds int[], p_q text, p_results int, p_device text, p_visitor text, p_sig text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_q    text := left(coalesce(p_q, ''), 120);
  v_prev bigint;
begin
  if exists (
    select 1 from public.search_events
    where visitor = coalesce(p_visitor, '') and sig = coalesce(p_sig, '')
      and created_at > now() - interval '10 minutes'
  ) then return false; end if;

  if v_q <> '' and coalesce(p_visitor, '') <> '' then
    select id into v_prev from public.search_events
    where visitor = p_visitor and created_at > now() - interval '1 minute'
      and deal = left(coalesce(p_deal, ''), 10) and type = left(coalesce(p_type, ''), 20)
      and areas = coalesce(p_areas[1:10], '{}') and beds = coalesce(p_beds[1:10], '{}')
      and price_min is not distinct from p_price_min and price_max is not distinct from p_price_max
      and q <> '' and (starts_with(v_q, q) or starts_with(q, v_q))
    order by id desc limit 1;
    if v_prev is not null then
      update public.search_events
        set q = v_q, results = greatest(0, coalesce(p_results, 0)), sig = left(coalesce(p_sig, ''), 64), created_at = now()
        where id = v_prev;
      return true;
    end if;
  end if;

  insert into public.search_events (deal, type, areas, price_min, price_max, beds, q, results, device, visitor, sig)
  values (left(coalesce(p_deal, ''), 10), left(coalesce(p_type, ''), 20), coalesce(p_areas[1:10], '{}'),
          p_price_min, p_price_max, coalesce(p_beds[1:10], '{}'), v_q,
          greatest(0, coalesce(p_results, 0)), coalesce(p_device, 'desktop'),
          left(coalesce(p_visitor, ''), 64), left(coalesce(p_sig, ''), 64));
  return true;
end $$;
revoke all on function public.track_search(text, text, text[], numeric, numeric, int[], text, int, text, text, text) from public;
grant execute on function public.track_search(text, text, text[], numeric, numeric, int[], text, int, text, text, text) to anon, authenticated;
