-- Колонковий revoke не діє, поки є табличний GRANT SELECT: знімаємо табличний
-- і видаємо доступ поколонково.

-- agencies: код запрошення не бачить ніхто, крім владника (через RPC)
revoke select on public.agencies from anon, authenticated;
grant select (id, name, brand, phone, email, about, verified, owner_id, created_at)
  on public.agencies to anon, authenticated;

-- profiles: анонім не бачить логін-пошту й прапорець адміна
revoke select on public.profiles from anon, authenticated;
grant select (id, role, name, avatar, phone, whatsapp, agency_id, is_owner,
              experience, rating, reviews, verified, languages, about, active, created_at)
  on public.profiles to anon;
grant select on public.profiles to authenticated;
