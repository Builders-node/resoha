-- 1. Копія кожної заявки адмінам: оголошення «Hogarli team» (колишній listings desk) належать
--    службовому акаунту, чию пошту ніхто не читає. Адмін отримує той самий лист і Telegram, що й ріелтор.
-- 2. Аналітика пошуку: правка тексту в межах хвилини (crawf → crawd) — той самий запис, не новий.
-- 3. Лічильники переглядів, показів, пошуків і лімітів — лише з сервера, з секретом (private.promo_config).
--    Старі функції лишаються доступними до релізу коду; їх закриває міграція 0067.

create or replace function public.notify_on_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_card  jsonb := private.listing_card(new.listing_id);
  v_agent record;
  v_lead  jsonb;
begin
  if new.channel = 'whatsapp' then return new; end if;
  select name, phone, whatsapp into v_agent from public.profiles where id = new.agent_id;
  v_lead := jsonb_build_object(
    'id', new.id, 'channel', new.channel, 'name', new.name, 'phone', new.phone, 'email', new.email,
    'message', new.message, 'visitAt', new.visit_at, 'interests', to_jsonb(new.interests),
    'contactVia', new.contact_via, 'listing', v_card);
  insert into public.notify_outbox (kind, user_id, payload) values ('lead_agent', new.agent_id, v_lead);
  insert into public.notify_outbox (kind, user_id, payload)
  select 'lead_agent', p.id, v_lead from public.profiles p
  where p.is_admin and p.active and p.id <> new.agent_id;
  if coalesce(new.email, '') <> '' then
    insert into public.notify_outbox (kind, email, payload) values ('lead_receipt', new.email,
      v_lead || jsonb_build_object('agent', jsonb_build_object(
        'name', coalesce(v_agent.name, ''), 'phone', coalesce(v_agent.phone, ''), 'whatsapp', coalesce(v_agent.whatsapp, ''))));
  end if;
  return new;
exception when others then
  -- сповіщення ніколи не ламає саму заявку
  raise warning 'notify_on_lead: %', sqlerrm;
  return new;
end $$;

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

  -- той самий відвідувач і ті самі фільтри за хвилину — це одне введення тексту, хоч би як його правили
  if v_q <> '' and coalesce(p_visitor, '') <> '' then
    select id into v_prev from public.search_events
    where visitor = p_visitor and created_at > now() - interval '1 minute'
      and deal = left(coalesce(p_deal, ''), 10) and type = left(coalesce(p_type, ''), 20)
      and areas = coalesce(p_areas[1:10], '{}') and beds = coalesce(p_beds[1:10], '{}')
      and price_min is not distinct from p_price_min and price_max is not distinct from p_price_max
      and q <> ''
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

-- секрет сервера: той самий рядок, що PROMO_SECRET у Vercel
create or replace function private.server_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_secret, '') <> '' and p_secret = (select secret from private.promo_config where id = 1)
$$;
revoke all on function private.server_ok(text) from public, anon, authenticated;

create or replace function public.track_event_s(
  p_secret text, p_listing uuid, p_development uuid, p_kind text, p_source text, p_device text, p_visitor text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return public.track_event(p_listing, p_development, p_kind, p_source, p_device, p_visitor);
end $$;

create or replace function public.bump_views_s(p_secret text, p_listing uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform public.bump_views(p_listing);
end $$;

create or replace function public.promo_track_s(p_secret text, p_kind text, p_ids uuid[], p_field text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform public.promo_track(p_kind, p_ids, p_field);
end $$;

create or replace function public.track_search_s(
  p_secret text, p_deal text, p_type text, p_areas text[], p_price_min numeric, p_price_max numeric,
  p_beds int[], p_q text, p_results int, p_device text, p_visitor text, p_sig text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return public.track_search(p_deal, p_type, p_areas, p_price_min, p_price_max, p_beds, p_q, p_results, p_device, p_visitor, p_sig);
end $$;

create or replace function public.rate_limit_hit_s(p_secret text, p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return public.rate_limit_hit(p_key, p_max, p_window_seconds);
end $$;

revoke all on function public.track_event_s(text, uuid, uuid, text, text, text, text) from public;
revoke all on function public.bump_views_s(text, uuid) from public;
revoke all on function public.promo_track_s(text, text, uuid[], text) from public;
revoke all on function public.track_search_s(text, text, text, text[], numeric, numeric, int[], text, int, text, text, text) from public;
revoke all on function public.rate_limit_hit_s(text, text, int, int) from public;
grant execute on function public.track_event_s(text, uuid, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.bump_views_s(text, uuid) to anon, authenticated;
grant execute on function public.promo_track_s(text, text, uuid[], text) to anon, authenticated;
grant execute on function public.track_search_s(text, text, text, text[], numeric, numeric, int[], text, int, text, text, text) to anon, authenticated;
grant execute on function public.rate_limit_hit_s(text, text, int, int) to anon, authenticated;
