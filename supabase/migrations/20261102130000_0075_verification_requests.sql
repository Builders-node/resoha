-- Перевірка ріелторів, агенцій і забудовників за документами.
-- Заявник вантажить документи (ліцензія, посвідчення, реєстрація компанії) у закритий бакет
-- і надсилає заявку; адмін бачить чергу, відкриває файли за тимчасовими посиланнями
-- і схвалює — тоді на профілі зʼявляється значок «перевірено» — або повертає з поясненням.
-- Таблицю пишуть лише функції нижче: прямих insert/update для користувачів немає.

/* ---------- закритий бакет для документів ---------- */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 20 * 1024 * 1024,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- вантажити — лише у власну теку; читати — власнику файлу й адміну
drop policy if exists verification_docs_insert on storage.objects;
create policy verification_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists verification_docs_read on storage.objects;
create policy verification_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (owner = auth.uid() or public.is_admin()));

drop policy if exists verification_docs_delete on storage.objects;
create policy verification_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (owner = auth.uid() or public.is_admin()));

/* ---------- заявки ---------- */
create table if not exists public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  subject_kind  text not null check (subject_kind in ('agent', 'agency', 'developer')),
  subject_id    uuid not null,
  subject_name  text not null default '' check (length(subject_name) <= 160),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  note          text not null default '' check (length(note) <= 1000),
  -- [{ kind, path, name, size, type }]; path — у бакеті verification-docs, у теці заявника
  documents     jsonb not null default '[]'::jsonb,
  admin_note    text not null default '' check (length(admin_note) <= 1000),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
-- на один профіль — одна відкрита заявка
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (subject_kind, subject_id) where status = 'pending';
create index if not exists verification_requests_requester_idx on public.verification_requests (requester_id, created_at desc);
create index if not exists verification_requests_status_idx on public.verification_requests (status, created_at);

alter table public.verification_requests enable row level security;
drop policy if exists verification_requests_read on public.verification_requests;
create policy verification_requests_read on public.verification_requests for select to authenticated
  using (requester_id = (select auth.uid()) or public.is_admin());
revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;

/* ---------- хто може просити перевірку для профілю ---------- */
create or replace function private.verification_subject(p_kind text, p_id uuid, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'agent' then (select name from public.profiles where id = p_id and id = p_user and role = 'agent')
    when 'agency' then (select a.name from public.agencies a where a.id = p_id
      and (a.owner_id = p_user or exists (select 1 from public.agency_members m
        where m.agency_id = a.id and m.profile_id = p_user and m.is_owner)))
    when 'developer' then (select name from public.developers where id = p_id and owner_id = p_user)
  end
$$;
revoke all on function private.verification_subject(text, uuid, uuid) from public, anon, authenticated;

/* ---------- заявник: надіслати ---------- */
create or replace function public.submit_verification(
  p_kind text, p_subject uuid, p_documents jsonb, p_note text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_docs jsonb := '[]'::jsonb;
  v_doc jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  v_name := private.verification_subject(p_kind, p_subject, v_uid);
  if v_name is null then raise exception 'You can only request verification for your own profile' using errcode = '42501'; end if;

  if exists (select 1 from public.verification_requests
             where subject_kind = p_kind and subject_id = p_subject and status = 'pending') then
    raise exception 'A request is already waiting for review' using errcode = '23505';
  end if;

  if jsonb_typeof(p_documents) <> 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'Attach at least one document' using errcode = '22023';
  end if;
  if jsonb_array_length(p_documents) > 10 then
    raise exception 'Up to 10 documents per request' using errcode = '22023';
  end if;

  -- лише файли, які заявник справді завантажив у свою теку закритого бакета
  for v_doc in select * from jsonb_array_elements(p_documents) loop
    if not exists (select 1 from storage.objects o
                   where o.bucket_id = 'verification-docs' and o.name = v_doc->>'path'
                     and (storage.foldername(o.name))[1] = v_uid::text) then
      raise exception 'Document not found: %', coalesce(v_doc->>'name', v_doc->>'path') using errcode = '22023';
    end if;
    v_docs := v_docs || jsonb_build_array(jsonb_build_object(
      'kind', case when v_doc->>'kind' in ('id', 'license', 'registration', 'tax', 'address', 'other')
                   then v_doc->>'kind' else 'other' end,
      'path', v_doc->>'path',
      'name', left(coalesce(v_doc->>'name', 'document'), 120),
      'size', coalesce((v_doc->>'size')::bigint, 0),
      'type', left(coalesce(v_doc->>'type', ''), 60)));
  end loop;

  insert into public.verification_requests (subject_kind, subject_id, subject_name, requester_id, note, documents)
  values (p_kind, p_subject, v_name, v_uid, left(coalesce(p_note, ''), 1000), v_docs)
  returning id into v_id;

  insert into public.notify_outbox (kind, user_id, payload)
  select 'verification_request', p.id, jsonb_build_object(
    'id', v_id, 'subjectKind', p_kind, 'subjectName', v_name, 'documents', jsonb_array_length(v_docs))
  from public.profiles p where p.is_admin and p.active;

  return v_id;
end $$;
revoke all on function public.submit_verification(text, uuid, jsonb, text) from public, anon;
grant execute on function public.submit_verification(text, uuid, jsonb, text) to authenticated;

/* ---------- заявник: відкликати відкриту заявку ---------- */
create or replace function public.withdraw_verification(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.verification_requests set status = 'withdrawn'
  where id = p_id and requester_id = auth.uid() and status = 'pending';
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.withdraw_verification(uuid) from public, anon;
grant execute on function public.withdraw_verification(uuid) to authenticated;

/* ---------- адмін: рішення ---------- */
-- Схвалення ставить verified = true на профілі; відмова профіль не чіпає.
-- Значок знімають, як і раніше, кнопкою Unverify у вкладках People / Agencies / Verification.
create or replace function public.review_verification(p_id uuid, p_decision text, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.verification_requests;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Bad decision' using errcode = '22023'; end if;
  if p_decision = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'Tell the applicant what is missing' using errcode = '22023';
  end if;

  update public.verification_requests
  set status = p_decision, admin_note = left(coalesce(trim(p_note), ''), 1000),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id and status = 'pending'
  returning * into r;
  if not found then raise exception 'Request not found or already decided' using errcode = 'P0002'; end if;

  if p_decision = 'approved' then
    if r.subject_kind = 'agent' then
      update public.profiles set verified = true where id = r.subject_id;
    elsif r.subject_kind = 'agency' then
      update public.agencies set verified = true where id = r.subject_id;
    else
      update public.developers set verified = true where id = r.subject_id;
    end if;
  end if;

  insert into public.notify_outbox (kind, user_id, payload)
  values ('verification_result', r.requester_id, jsonb_build_object(
    'decision', p_decision, 'note', r.admin_note, 'subjectKind', r.subject_kind, 'subjectName', r.subject_name));

  return jsonb_build_object('id', r.id, 'subjectKind', r.subject_kind, 'subjectId', r.subject_id, 'subjectName', r.subject_name);
end $$;
revoke all on function public.review_verification(uuid, text, text) from public, anon;
grant execute on function public.review_verification(uuid, text, text) to authenticated;

/* ---------- журнал адміна: значок забудовника теж записуємо ---------- */
alter table public.admin_log drop constraint if exists admin_log_target_kind_check;
alter table public.admin_log add constraint admin_log_target_kind_check
  check (target_kind in ('listing', 'profile', 'agency', 'review', 'development', 'building', 'campaign', 'report', 'site', 'developer'));
