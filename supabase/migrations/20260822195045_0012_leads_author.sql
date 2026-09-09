-- Заявку тепер можна привʼязати до акаунта покупця, щоб він бачив свою історію.
alter table public.leads
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists email text not null default '';

create index if not exists leads_user_idx on public.leads (user_id);

-- Читає ріелтор, власник агенції — і сам відправник
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select
  using (
    agent_id = (select auth.uid())
    or user_id = (select auth.uid())
    or public.is_agency_owner(agency_id)
  );

-- Гість може лишити заявку без акаунта; залогінений — тільки від свого імені
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert
  with check (user_id is null or user_id = (select auth.uid()));
