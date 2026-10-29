-- Передача забудовника тепер забирає з собою і його ЖК та юніти в них. Раніше переходив
-- лише профіль, а ЖК лишались на попередньому власникові, тож компанія бачила свою сторінку,
-- але не могла редагувати власні проєкти. Переходить тільки те, що належало попередньому
-- власникові профілю: ЖК, які завів для цього забудовника інший ріелтор, лишаються за ним.

/** Що за посилання — для сторінки передачі, видно й без входу. Тепер зі списком того, що перейде. */
create or replace function public.developer_handover_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'developer', jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name, 'logo', v.logo),
    'from', coalesce((select name from public.profiles where id = h.created_by), ''),
    'mine', v.owner_id = auth.uid(),
    'projects', (select count(*) from public.developments d
                  where d.developer_id = v.id and d.agent_id is not distinct from v.owner_id),
    'units', (select count(*) from public.listings l join public.developments d on d.id = l.development_id
               where d.developer_id = v.id and d.agent_id is not distinct from v.owner_id
                 and l.agent_id is not distinct from v.owner_id),
    'status', case when h.accepted_at is not null then 'accepted' when h.revoked_at is not null then 'revoked'
                   when h.expires_at < now() then 'expired' else 'pending' end)
  from public.developer_handovers h join public.developers v on v.id = h.developer_id
  where p_token is not null and length(p_token) >= 32 and h.token = p_token
$$;
revoke all on function public.developer_handover_info(text) from public;
grant execute on function public.developer_handover_info(text) to anon, authenticated;

/** Прийняти: профіль, його ЖК і юніти в них переходять до цього акаунта, «перевірено» не змінюється. */
create or replace function public.accept_developer_handover(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.developer_handovers; v public.developers; v_prev uuid; v_agency uuid;
  v_projects int := 0; v_units int := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to take over the profile'; end if;
  select * into h from public.developer_handovers where token = p_token and length(coalesce(p_token, '')) >= 32 for update;
  if not found or h.revoked_at is not null then raise exception 'Link not found'; end if;
  if h.accepted_at is not null then raise exception 'This link has already been used'; end if;
  if h.expires_at < now() then raise exception 'This link has expired. Ask for a new one.'; end if;

  select owner_id into v_prev from public.developers where id = h.developer_id for update;
  update public.developers set owner_id = auth.uid() where id = h.developer_id returning * into v;

  if v_prev is not null and v_prev <> auth.uid() then
    -- ЖК і оголошення тримаються на ролі agent (кабінет /agent, агенція), тож компанія стає
    -- ріелтором — так само, як кнопкою «Стати ріелтором».
    update public.profiles set role = 'agent' where id = auth.uid() and role = 'user';
    select agency_id into v_agency from public.profiles where id = auth.uid();

    -- Спершу юніти, поки ЖК ще на попередньому власникові.
    update public.listings l set agent_id = auth.uid(), agency_id = v_agency
      from public.developments d
     where l.development_id = d.id and d.developer_id = v.id and d.agent_id = v_prev and l.agent_id = v_prev;
    get diagnostics v_units = row_count;

    update public.developments set agent_id = auth.uid(), agency_id = v_agency
     where developer_id = v.id and agent_id = v_prev;
    get diagnostics v_projects = row_count;
  end if;

  update public.developer_handovers set accepted_at = now(), accepted_by = auth.uid() where id = h.id;
  return jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name, 'projects', v_projects, 'units', v_units);
end $$;
revoke all on function public.accept_developer_handover(text) from public, anon;
grant execute on function public.accept_developer_handover(text) to authenticated;
