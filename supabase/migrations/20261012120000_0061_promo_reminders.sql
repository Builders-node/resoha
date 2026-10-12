-- Нагадування про кінець просування.
--
-- За 3 дні до кінця кампанії і в день, коли вона скінчилась, власнику йде лист
-- (черга notify_outbox з 0050) з кнопкою «Продовжити» — вона відкриває вкладку Promote
-- з тим самим обʼєктом, видом і строком. Якщо продовження вже куплене, листа немає.
-- Разовий Bump і повернені кампанії не нагадуємо.
--
-- Міграція ідемпотентна; без DELETE і без DROP POLICY.

alter table public.promo_campaigns
  add column if not exists ending_notified_at timestamptz,
  add column if not exists ended_notified_at  timestamptz;

-- те, що скінчилось до цієї міграції, — вже історія: не шлемо листів заднім числом
update public.promo_campaigns set ended_notified_at = now()
where ended_notified_at is null and status in ('ended', 'cancelled');

create or replace function public.promo_remind()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  -- закінчується за 3 дні, а продовження ще немає
  with due as (
    update public.promo_campaigns c set ending_notified_at = now()
    where c.status = 'active' and c.ending_notified_at is null and c.refunded_at is null
      and c.product <> 'bump' and c.days > 3
      and c.starts_at <= now() and c.ends_at between now() and now() + interval '3 days'
      and not exists (
        select 1 from public.promo_campaigns x
        where x.target_kind = c.target_kind and x.target_id = c.target_id and x.product = c.product
          and x.status = 'active' and x.id <> c.id and x.ends_at > c.ends_at)
    returning c.*
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'promo_ending', d.owner_id, jsonb_build_object(
      'campaignId', d.id, 'kind', d.target_kind, 'targetName', d.target_name, 'product', d.product,
      'days', d.days, 'endsAt', d.ends_at, 'impressions', d.impressions, 'clicks', d.clicks)
    from due d returning 1
  )
  select count(*) into k from ins;
  n := n + k;

  -- скінчилась (promo_sweep перевів у ended) і нічого на заміну не йде
  with due as (
    update public.promo_campaigns c set ended_notified_at = now()
    where c.status = 'ended' and c.ended_notified_at is null and c.refunded_at is null
      and c.product <> 'bump'
      and not exists (
        select 1 from public.promo_campaigns x
        where x.target_kind = c.target_kind and x.target_id = c.target_id and x.product = c.product
          and x.status = 'active' and x.id <> c.id)
    returning c.*
  ), ins as (
    insert into public.notify_outbox (kind, user_id, payload)
    select 'promo_ended', d.owner_id, jsonb_build_object(
      'campaignId', d.id, 'kind', d.target_kind, 'targetName', d.target_name, 'product', d.product,
      'days', d.days, 'endsAt', d.ends_at, 'impressions', d.impressions, 'clicks', d.clicks)
    from due d returning 1
  )
  select count(*) into k from ins;
  n := n + k;

  -- скінчилась, але є продовження: листа не треба, лише позначка
  update public.promo_campaigns set ended_notified_at = now()
  where status = 'ended' and ended_notified_at is null;
  return n;
end $$;
revoke all on function public.promo_remind() from public, anon, authenticated;

-- щогодини; notify-tick (0050) побачить нові рядки в черзі й відправить листи
do $$
begin
  perform cron.schedule('promo-remind', '7 * * * *', 'select public.promo_remind()');
exception when others then
  raise notice 'pg_cron unavailable (%)', sqlerrm;
end $$;
