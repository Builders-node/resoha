-- Передача профілю забудовника представнику компанії. Власник профілю (або адмін) створює
-- одноразове посилання /developer/claim/<token> і надсилає його компанії сам; хто відкрив
-- посилання й увійшов в акаунт, стає власником профілю. Профілі заводимо наперед (каталог
-- забудовників), а справжні компанії забирають їх собі.
create table if not exists public.developer_handovers (
  id           uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.developers(id) on delete cascade,
  token        text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id) on delete set null,
  revoked_at   timestamptz
);
create unique index if not exists developer_handovers_token on public.developer_handovers (token);
create index if not exists developer_handovers_developer_idx on public.developer_handovers (developer_id, created_at desc);

alter table public.developer_handovers enable row level security;
revoke all on public.developer_handovers from anon, authenticated;

/** Нове посилання на передачу; попереднє невикористане скасовується. */
create or replace function public.create_developer_handover(p_developer uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.developers; h public.developer_handovers;
begin
  select * into v from public.developers where id = p_developer;
  if not found or not (v.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Only the profile owner can hand it over';
  end if;
  if (select count(*) from public.developer_handovers where created_by = auth.uid() and created_at > now() - interval '1 day') >= 300 then
    raise exception 'Too many handover links today. Please try again tomorrow.';
  end if;
  update public.developer_handovers set revoked_at = now()
   where developer_id = v.id and accepted_at is null and revoked_at is null;
  insert into public.developer_handovers (developer_id, created_by) values (v.id, auth.uid()) returning * into h;
  return jsonb_build_object('token', h.token, 'expiresAt', h.expires_at);
end $$;
revoke all on function public.create_developer_handover(uuid) from public, anon;
grant execute on function public.create_developer_handover(uuid) to authenticated;

/** Що за посилання — для сторінки передачі, видно й без входу. */
create or replace function public.developer_handover_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'developer', jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name, 'logo', v.logo),
    'from', coalesce((select name from public.profiles where id = h.created_by), ''),
    'mine', v.owner_id = auth.uid(),
    'status', case when h.accepted_at is not null then 'accepted' when h.revoked_at is not null then 'revoked'
                   when h.expires_at < now() then 'expired' else 'pending' end)
  from public.developer_handovers h join public.developers v on v.id = h.developer_id
  where p_token is not null and length(p_token) >= 32 and h.token = p_token
$$;
revoke all on function public.developer_handover_info(text) from public;
grant execute on function public.developer_handover_info(text) to anon, authenticated;

/** Прийняти: профіль переходить до цього акаунта, «перевірено» не змінюється. */
create or replace function public.accept_developer_handover(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.developer_handovers; v public.developers;
begin
  if auth.uid() is null then raise exception 'Sign in to take over the profile'; end if;
  select * into h from public.developer_handovers where token = p_token and length(coalesce(p_token, '')) >= 32 for update;
  if not found or h.revoked_at is not null then raise exception 'Link not found'; end if;
  if h.accepted_at is not null then raise exception 'This link has already been used'; end if;
  if h.expires_at < now() then raise exception 'This link has expired. Ask for a new one.'; end if;

  update public.developers set owner_id = auth.uid() where id = h.developer_id returning * into v;
  update public.developer_handovers set accepted_at = now(), accepted_by = auth.uid() where id = h.id;
  return jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name);
end $$;
revoke all on function public.accept_developer_handover(text) from public, anon;
grant execute on function public.accept_developer_handover(text) to authenticated;
