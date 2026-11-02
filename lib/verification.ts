import { supabaseServer } from './supabase/server';
import { VERIFY_BUCKET, mapVerification, type VerificationRequest, type VerifyKind } from './verificationShared';

/**
 * Заявки на перевірку (міграція 0075). Пишуть лише RPC submit/withdraw/review_verification,
 * читає RLS: заявник бачить свої, адмін — усі. До міграції таблиці немає — тоді порожньо.
 */
const COLS = 'id, subject_kind, subject_id, subject_name, requester_id, status, note, documents, admin_note, reviewed_at, created_at';

/** Остання заявка заявника для кожного профілю, який він може перевірити */
export async function myVerifications(kind?: VerifyKind, subjectId?: string): Promise<VerificationRequest[]> {
  const client = await supabaseServer();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return [];
  let q = client.from('verification_requests').select(COLS).eq('requester_id', auth.user.id)
    .order('created_at', { ascending: false }).limit(50);
  if (kind) q = q.eq('subject_kind', kind);
  if (subjectId) q = q.eq('subject_id', subjectId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map(mapVerification);
}

export async function submitVerification(input: {
  kind: VerifyKind; subjectId: string; note: string;
  documents: { kind: string; path: string; name: string; size: number; type: string }[];
}) {
  const { data, error } = await (await supabaseServer()).rpc('submit_verification', {
    p_kind: input.kind, p_subject: input.subjectId, p_documents: input.documents, p_note: input.note,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function withdrawVerification(id: string) {
  const { data, error } = await (await supabaseServer()).rpc('withdraw_verification', { p_id: id });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Черга для адміна: відкриті заявки від найстаріших і останні рішення. Файли — за посиланнями на 30 хвилин. */
export async function adminVerificationQueue() {
  const client = await supabaseServer();
  const sel = `${COLS}, requester:profiles!verification_requests_requester_id_fkey(name, email)`;
  const [pending, decided, devs] = await Promise.all([
    client.from('verification_requests').select(sel).eq('status', 'pending').order('created_at', { ascending: true }).limit(200),
    client.from('verification_requests').select(sel).in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false }).limit(30),
    client.from('developers').select('id, slug, name, verified, owner_id').order('name').limit(1000),
  ]);
  const queue = (pending.data ?? []).map(mapVerification);
  const recent = (decided.data ?? []).map(mapVerification);

  const paths = queue.flatMap((r) => r.documents.map((d) => d.path)).filter(Boolean);
  if (paths.length) {
    const { data: signed } = await client.storage.from(VERIFY_BUCKET).createSignedUrls(paths, 30 * 60);
    const url = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
    for (const r of queue) for (const d of r.documents) d.url = url.get(d.path) ?? undefined;
  }

  return {
    ready: !pending.error,
    queue,
    recent,
    developers: (devs.data ?? []).map((d) => ({
      id: String(d.id), slug: String(d.slug), name: String(d.name), verified: Boolean(d.verified), hasOwner: Boolean(d.owner_id),
    })),
  };
}

export async function adminReviewVerification(id: string, decision: 'approved' | 'rejected', note: string) {
  const { data, error } = await (await supabaseServer()).rpc('review_verification', {
    p_id: id, p_decision: decision, p_note: note,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; subjectKind: VerifyKind; subjectId: string; subjectName: string };
}

/** Зняти чи поставити значок забудовнику вручну — як Verify/Unverify у People та Agencies */
export async function adminSetDeveloperVerified(id: string, verified: boolean) {
  const { data, error } = await (await supabaseServer()).from('developers')
    .update({ verified }).eq('id', id).select('id, slug, name').maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; slug: string; name: string } | null;
}
