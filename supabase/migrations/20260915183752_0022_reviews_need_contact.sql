-- Досі відгук міг лишити будь-хто залогінений про будь-кого: на живій площадці
-- це зброя конкурентів, а не рейтинг. Тепер потрібен слід звернення — заявка,
-- відправлена цьому ріелтору з-під свого акаунта.
drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and agent_id <> (select auth.uid())
    and exists (
      select 1 from public.leads l
      where l.agent_id = reviews.agent_id
        and l.user_id = (select auth.uid())
    )
  );

-- Редагувати свій відгук автор може й далі, але не переписати його на іншого ріелтора.
drop policy if exists reviews_edit on public.reviews;
create policy reviews_edit on public.reviews for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.leads l
      where l.agent_id = reviews.agent_id
        and l.user_id = (select auth.uid())
    )
  );
