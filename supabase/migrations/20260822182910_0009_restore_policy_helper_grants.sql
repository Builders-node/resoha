-- Політики RLS обчислюються з правами того, хто робить запит, тому предикати
-- is_agency_owner() і my_agency() мають лишатися виконуваними для anon/authenticated.
-- Обидві повертають лише факт про власний рядок викликача, тож це безпечно.
grant execute on function public.is_agency_owner(uuid) to anon, authenticated;
grant execute on function public.my_agency()           to anon, authenticated;
