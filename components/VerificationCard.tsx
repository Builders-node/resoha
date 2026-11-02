'use client';
import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useLang, useT } from './LangProvider';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import {
  DOC_KINDS, DOC_LABELS, MAX_VERIFY_BYTES, MAX_VERIFY_DOCS, VERIFY_BUCKET, VERIFY_TYPES, WHAT_TO_SEND,
  type DocKind, type VerificationRequest, type VerifyKind,
} from '@/lib/verificationShared';

type Picked = { file: File; kind: DocKind };

const TITLES: Record<VerifyKind, string> = {
  agent: 'Get the verified badge',
  agency: 'Verify the agency',
  developer: 'Verify {name}',
};

/** Вантажить файли в закритий бакет за підписаними посиланнями; повертає описи для заявки */
async function uploadDocs(picked: Picked[]) {
  const res = await fetch('/api/verification/uploads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: picked.map(({ file }) => ({ name: file.name, type: file.type, size: file.size })) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
  const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(VERIFY_BUCKET);
  const uploads: { path: string; token: string }[] = data.uploads;
  const results = await Promise.all(uploads.map((u, i) =>
    storage.uploadToSignedUrl(u.path, u.token, picked[i].file, { contentType: picked[i].file.type })));
  const failed = results.findIndex((r) => r.error);
  if (failed >= 0) throw new Error(`${picked[failed].file.name}: ${results[failed].error!.message}`);
  return uploads.map((u, i) => ({
    kind: picked[i].kind, path: u.path, name: picked[i].file.name, size: picked[i].file.size, type: picked[i].file.type,
  }));
}

/**
 * Заявка на значок «перевірено» за документами: ріелтор — за свій профіль, власник агенції — за агенцію,
 * забудовник — за компанію. Показує стан останньої заявки: чекає, схвалено, повернуто з поясненням.
 */
export default function VerificationCard({ kind, subjectId, name, verified, compact = false, onChanged }: {
  kind: VerifyKind;
  subjectId: string;
  name: string;
  verified: boolean;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [last, setLast] = useState<VerificationRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await fetch(`/api/verification?kind=${kind}&id=${subjectId}`).then((r) => r.json()).catch(() => ({}));
    setLast((d.items ?? [])[0] ?? null);
  }, [kind, subjectId]);
  useEffect(() => { load(); }, [load]);

  function add(files: FileList | null) {
    const next = [...picked];
    for (const file of Array.from(files ?? [])) {
      if (!VERIFY_TYPES[file.type]) { toast(t('{name}: only PDF, JPEG, PNG or WebP', { name: file.name })); continue; }
      if (file.size > MAX_VERIFY_BYTES) { toast(t('{name} is over 20 MB', { name: file.name })); continue; }
      if (next.length >= MAX_VERIFY_DOCS) { toast(t('Up to {n} documents', { n: MAX_VERIFY_DOCS })); break; }
      next.push({ file, kind: next.length === 0 ? (kind === 'agent' ? 'license' : 'registration') : 'id' });
    }
    setPicked(next);
    if (input.current) input.current.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked.length) return toast(t('Attach at least one document'));
    setBusy(true);
    try {
      const documents = await uploadDocs(picked);
      const res = await fetch('/api/verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, subjectId, note, documents }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? t('Could not send'));
      toast(t('Sent — we usually check documents within two working days'));
      setPicked([]); setNote(''); setOpen(false);
      await load(); onChanged?.();
    } catch (err) {
      toast((err as Error).message);
    }
    setBusy(false);
  }

  async function withdraw() {
    if (!last || !confirm(t('Withdraw this request? You can send a new one at any time.'))) return;
    const res = await fetch(`/api/verification?id=${last.id}`, { method: 'DELETE' });
    toast(t(res.ok ? 'Request withdrawn' : 'Not allowed'));
    load();
  }

  if (last === undefined) return compact ? null : <div className="panel muted">{t('Loading…')}</div>;

  const pending = last?.status === 'pending';
  const rejected = !verified && last?.status === 'rejected';
  const title = t(TITLES[kind], { name });

  const body = (
    <>
      {verified ? (
        <p className="verify__state verify__state--ok">
          <Icon name="verified" size={18} />
          <span>{t('Verified. Buyers see the badge on your page and cards.')}
            {last?.status === 'approved' && last.reviewedAt && ` ${t('Checked {date}.', { date: fmtDate(last.reviewedAt, lang) })}`}</span>
        </p>
      ) : pending ? (
        <div className="verify__state verify__state--wait">
          <Icon name="clock" size={18} />
          <span>
            {t('Documents sent {date}. We’ll email you once they’re checked.', { date: fmtDate(last!.createdAt, lang) })}
            {' '}<span className="muted">({last!.documents.length} {t(last!.documents.length === 1 ? 'file' : 'files')})</span>
          </span>
          <button type="button" className="link-btn" onClick={withdraw}>{t('Withdraw')}</button>
        </div>
      ) : (
        <>
          {rejected && (
            <div className="verify__state verify__state--bad">
              <Icon name="flag" size={18} />
              <span><b>{t('We couldn’t verify it yet.')}</b> {last!.adminNote}</span>
            </div>
          )}
          {!open ? (
            <>
              {!rejected && <p className="muted small" style={{ margin: '0 0 12px' }}>{t('Verified profiles get a badge on their page, cards and listings, and buyers trust them more.')}</p>}
              <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
                <Icon name="shield" size={16} /> {t(rejected ? 'Send documents again' : 'Send documents')}
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="verify__form">
              <p className="muted small" style={{ margin: 0 }}>{t(WHAT_TO_SEND[kind])}</p>
              <p className="tiny muted" style={{ margin: 0 }}>
                <Icon name="lock" size={13} /> {t('Files stay private: only the Hogarli team sees them. PDF, JPEG, PNG or WebP, up to 20 MB each.')}
              </p>
              {picked.length > 0 && (
                <ul className="verify__files">
                  {picked.map((p, i) => (
                    <li key={i}>
                      <Icon name="deed" size={16} />
                      <span className="verify__fname" title={p.file.name}>{p.file.name}</span>
                      <select className="input small" value={p.kind} aria-label={t('Document type')}
                        onChange={(e) => setPicked((x) => x.map((y, j) => (j === i ? { ...y, kind: e.target.value as DocKind } : y)))}>
                        {DOC_KINDS.map((k) => <option key={k} value={k}>{t(DOC_LABELS[k])}</option>)}
                      </select>
                      <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={t('Remove {name}', { name: p.file.name })}
                        onClick={() => setPicked((x) => x.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={input} type="file" hidden multiple accept={Object.keys(VERIFY_TYPES).join(',')}
                onChange={(e) => add(e.target.files)} />
              <button type="button" className="btn btn--ghost" onClick={() => input.current?.click()}>
                <Icon name="plus" size={16} /> {t(picked.length ? 'Add another file' : 'Choose files')}
              </button>
              <textarea className="input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={t('Anything we should know? Licence number, association, who signs for the company…')} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn--primary" disabled={busy || !picked.length}>{t(busy ? 'Sending…' : 'Send for review')}</button>
                <button type="button" className="btn btn--ghost" onClick={() => { setOpen(false); setPicked([]); }}>{t('Cancel')}</button>
              </div>
            </form>
          )}
        </>
      )}
    </>
  );

  if (compact) return <div className="verify verify--compact">{body}</div>;
  return (
    <div className="panel verify">
      <h3 style={{ marginBottom: 10 }}>{title}</h3>
      {body}
    </div>
  );
}
