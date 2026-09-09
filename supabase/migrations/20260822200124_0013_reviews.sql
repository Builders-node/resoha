-- Відгуки про ріелтора: рейтинг у профілі перестає бути намальованим числом.
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.profiles(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  body       text not null default '',
  created_at timestamptz not null default now(),
  unique (agent_id, author_id)          -- один відгук на ріелтора від одного акаунта
);

create index if not exists reviews_agent_idx on public.reviews (agent_id);

alter table public.reviews enable row level security;

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);

drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and agent_id <> (select auth.uid()));

drop policy if exists reviews_edit on public.reviews;
create policy reviews_edit on public.reviews for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated
  using (author_id = (select auth.uid()));

-- Агрегати тримаємо в profiles, щоб картки й списки не рахували їх щоразу
create or replace function public.refresh_agent_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.agent_id, old.agent_id);
begin
  update public.profiles p set
    rating  = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.agent_id = target), 0),
    reviews = (select count(*) from public.reviews r where r.agent_id = target)
  where p.id = target;
  return null;
end $$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_agent_rating();

-- Демо-числа рейтингів більше не потрібні: показуємо лише реальні відгуки
update public.profiles set rating = 0, reviews = 0 where role = 'agent';
