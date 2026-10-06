-- Паспорт ділянки, друга хвиля: те, що покупець питає одразу після титулу й комунікацій.
-- На «Ready to build» не впливає — це довідкові поля.
alter table public.land_facts
  add column sea_view text not null default 'unknown' check (sea_view in ('ocean', 'partial', 'none', 'unknown')),
  add column beach    text not null default 'unknown' check (beach in ('on_beach', 'walk', 'drive', 'unknown')),
  add column internet text not null default 'unknown' check (internet in ('fiber', 'wireless', 'starlink', 'unknown')),
  add column flood    text not null default 'unknown' check (flood in ('none', 'part', 'high', 'unknown'));

-- штамп «хто й коли перевірив» має рахувати й нові поля
create or replace function public.land_facts_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.title_status = 'unknown' and new.survey = 'unknown' and new.road_access = 'unknown'
     and new.power = 'unknown' and new.water = 'unknown' and new.zolitur = 'unknown'
     and new.zone = 'unknown' and new.slope = 'unknown'
     and new.sea_view = 'unknown' and new.beach = 'unknown' and new.internet = 'unknown' and new.flood = 'unknown' then
    new.checked_by := null;
    new.checked_at := null;
  else
    new.checked_by := coalesce(auth.uid(), new.checked_by);
    new.checked_at := now();
  end if;
  return new;
end $$;

revoke all on function public.land_facts_stamp() from public, anon, authenticated;

grant insert (sea_view, beach, internet, flood), update (sea_view, beach, internet, flood) on public.land_facts to authenticated;
