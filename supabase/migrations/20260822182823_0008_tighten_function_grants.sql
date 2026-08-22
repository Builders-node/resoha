-- Фіксимо зауваження лінтера безпеки

-- 1. Стабільний search_path для генератора коду
alter function public.gen_invite_code() set search_path = public;

-- 2. Тригерні та службові функції не мають бути доступні через REST
revoke all on function public.handle_new_user()    from public, anon, authenticated;
revoke all on function public.enforce_owner_rules() from public, anon, authenticated;
revoke all on function public.is_agency_owner(uuid) from public, anon, authenticated;
revoke all on function public.my_agency()           from public, anon, authenticated;
revoke all on function public.gen_invite_code()     from public, anon, authenticated;

-- 3. Дії з агенцією — лише для залогінених (усередині ще й перевірка auth.uid())
revoke all on function public.create_agency(text, text, text, text, text) from public, anon;
revoke all on function public.join_agency(text)     from public, anon;
revoke all on function public.leave_agency()        from public, anon;
revoke all on function public.remove_member(uuid)   from public, anon;
revoke all on function public.rotate_invite_code()  from public, anon;

grant execute on function public.create_agency(text, text, text, text, text) to authenticated;
grant execute on function public.join_agency(text)     to authenticated;
grant execute on function public.leave_agency()        to authenticated;
grant execute on function public.remove_member(uuid)   to authenticated;
grant execute on function public.rotate_invite_code()  to authenticated;

-- 4. bump_views лишається публічною свідомо: лічильник переглядів працює і для гостей,
--    єдине, що вона вміє, — інкремент views на одному рядку.
grant execute on function public.bump_views(uuid) to anon, authenticated;
