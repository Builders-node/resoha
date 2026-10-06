-- Один акаунт на людину. Покупець стає ріелтором у будь-який момент кнопкою в /agent,
-- без нового акаунта. Раніше вікно було 15 хвилин після реєстрації (лише для Google).
-- Ріелтором і так може зареєструватись будь-хто, тож обмеження нічого не захищало.
-- Назад у покупця не повертаємо: оголошення, заявки й агенція тримаються на ролі agent.
create or replace function public.become_realtor()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'agent'
  where id = auth.uid() and role = 'user';
end $$;

revoke all on function public.become_realtor() from public, anon;
grant execute on function public.become_realtor() to authenticated;
