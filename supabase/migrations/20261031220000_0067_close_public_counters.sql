-- Застосовувати ПІСЛЯ релізу коду з 0066 і коли /api/health показує PROMO_SECRET: set.
-- Лічильники більше не викликаються напряму з браузера: лише через *_s із секретом сервера.
revoke execute on function public.track_event(uuid, uuid, text, text, text, text) from anon, authenticated;
revoke execute on function public.bump_views(uuid) from anon, authenticated;
revoke execute on function public.promo_track(text, uuid[], text) from anon, authenticated;
revoke execute on function public.track_search(text, text, text[], numeric, numeric, int[], text, int, text, text, text) from anon, authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from anon, authenticated;
