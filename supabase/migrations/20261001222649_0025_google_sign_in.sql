-- Вхід через Google. Профіль, як і раніше, створює тригер, але Google кладе імʼя
-- у full_name, а фото — в avatar_url / picture: беремо їх, якщо є.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, phone, whatsapp, avatar)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'full_name', ''), ''),
    -- роль із метаданих довіряємо лише нашій формі реєстрації; Google її не передає
    case when new.raw_user_meta_data->>'role' = 'agent' then 'agent' else 'user' end,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', ''),
      'https://picsum.photos/seed/resoha-' || replace(new.id::text, '-', '') || '/200/200'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Після Google новий акаунт — покупець. Якщо людина реєструвалась із вкладки Realtor / Agency,
-- /auth/callback одразу викликає цю функцію. Вікно 15 хвилин: це частина реєстрації,
-- а не спосіб перетворити давній покупецький акаунт на ріелторський.
create or replace function public.become_realtor()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'agent'
  where id = auth.uid() and role = 'user' and created_at > now() - interval '15 minutes';
end $$;

revoke all on function public.become_realtor() from public, anon;
grant execute on function public.become_realtor() to authenticated;
