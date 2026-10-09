-- Налаштування сайту, які адмін вмикає й вимикає без релізу. Поки що — блоки калькулятора
-- на сторінці продажу: витрати на купівлю й фінансування окремо.

create table if not exists public.site_settings (
  id                  int primary key default 1 check (id = 1),
  show_purchase_costs boolean not null default true,
  show_financing      boolean not null default true,
  updated_at          timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

do $$ begin
  create policy site_settings_read on public.site_settings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy site_settings_admin on public.site_settings for update
  using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

grant select on public.site_settings to anon, authenticated;
grant update (show_purchase_costs, show_financing, updated_at) on public.site_settings to authenticated;

-- журнал адміна: скарги (0049) і налаштування сайту теж пишуться в лог
alter table public.admin_log drop constraint if exists admin_log_target_kind_check;
alter table public.admin_log add constraint admin_log_target_kind_check
  check (target_kind in ('listing', 'profile', 'agency', 'review', 'development', 'building', 'campaign', 'report', 'site'));
