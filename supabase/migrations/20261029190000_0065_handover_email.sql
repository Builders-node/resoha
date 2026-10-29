-- Посилання на передачу профілю забудовника можна надіслати листом прямо з кабінету: вказуємо
-- email компанії, лист із кнопкою «забрати профіль» іде через ту саму чергу notify_outbox, що й
-- запрошення в агенцію. Прийняти, як і раніше, може будь-хто, хто відкрив посилання й увійшов.
alter table public.developer_handovers add column if not exists email text not null default '';

/**
 * Нове посилання на передачу з листом на цю адресу; попереднє невикористане скасовується.
 * Окреме перевантаження без default: версія з одним аргументом (0063) лишається для простого посилання.
 */
create or replace function public.create_developer_handover(p_developer uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.developers; h public.developer_handovers; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into v from public.developers where id = p_developer;
  if not found or not (v.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Only the profile owner can hand it over';
  end if;
  if v_email <> '' and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200) then
    raise exception 'Enter a valid email';
  end if;
  if (select count(*) from public.developer_handovers where created_by = auth.uid() and created_at > now() - interval '1 day') >= 300 then
    raise exception 'Too many handover links today. Please try again tomorrow.';
  end if;
  update public.developer_handovers set revoked_at = now()
   where developer_id = v.id and accepted_at is null and revoked_at is null;
  insert into public.developer_handovers (developer_id, created_by, email) values (v.id, auth.uid(), v_email) returning * into h;

  if v_email <> '' then
    insert into public.notify_outbox (kind, email, payload) values ('developer_handover', v_email, jsonb_build_object(
      'developer', v.name, 'slug', v.slug,
      'inviter', coalesce((select name from public.profiles where id = auth.uid()), ''),
      'projects', (select count(*) from public.developments d where d.developer_id = v.id and d.agent_id is not distinct from v.owner_id),
      'token', h.token, 'expiresAt', h.expires_at));
  end if;
  return jsonb_build_object('token', h.token, 'expiresAt', h.expires_at, 'email', h.email);
end $$;
revoke all on function public.create_developer_handover(uuid, text) from public, anon;
grant execute on function public.create_developer_handover(uuid, text) to authenticated;
