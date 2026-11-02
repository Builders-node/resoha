'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmAction, { type Ask } from './ConfirmAction';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import { DOC_LABELS, KIND_LABELS, type VerificationRequest, type VerifyKind } from '@/lib/verificationShared';

type Dev = { id: string; slug: string; name: string; verified: boolean; hasOwner: boolean };

const PAGE: Record<VerifyKind, (id: string, slug?: string) => string> = {
  agent: (id) => `/agents/${id}`,
  agency: (id) => `/agency/${id}`,
  developer: (id, slug) => `/developers/${slug ?? id}`,
};

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Очередь перевірки за документами: заявки ріелторів, агенцій і забудовників.
 * Схвалення ставить значок «перевірено», відмова повертає заявку з поясненням листом.
 * Нижче — значки забудовників вручну: у People та Agencies такі кнопки вже є, тут — для компаній.
 */
export default function VerificationAdmin() {
  const [queue, setQueue] = useState<VerificationRequest[]>([]);
  const [recent, setRecent] = useState<VerificationRequest[]>([]);
  const [devs, setDevs] = useState<Dev[]>([]);
  const [ready, setReady] = useState(true);
  const [busy, setBusy] = useState(true);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [devQ, setDevQ] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    const d = await fetch('/api/admin/verification').then((r) => r.json()).catch(() => ({}));
    setQueue(d.queue ?? []);
    setRecent(d.recent ?? []);
    setDevs(d.developers ?? []);
    setReady(d.ready !== false);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, message: string) {
    const res = await fetch('/api/admin/verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? message : d.error ?? 'Not allowed');
    load();
  }

  const slugOf = useMemo(() => new Map(devs.map((d) => [d.id, d.slug])), [devs]);
  const shownDevs = useMemo(() => {
    const n = devQ.trim().toLowerCase();
    return devs.filter((d) => !n || d.name.toLowerCase().includes(n))
      .sort((a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name)).slice(0, 30);
  }, [devs, devQ]);

  return (
    <>
      <div className="panel">
        <div className="fgroup__head">
          <h3>Verification requests</h3>
          <span className="muted small">{busy ? 'Loading…' : `${queue.length} waiting`}</span>
        </div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Realtors, agency owners and developers send their documents from the dashboard. Check that the name matches
          the profile and the documents are current. Approving puts the verified badge on their page, cards and listings,
          and lets a realtor’s new listings skip the moderation queue.
        </p>
        {!ready && <p className="note-ok small">Apply migration 0075 in the Supabase SQL Editor to turn on verification requests.</p>}
        {queue.length === 0 ? (
          <div className="empty"><div className="empty__ico"><Icon name="verified" size={40} /></div>
            {busy ? 'Loading…' : 'No requests waiting'}</div>
        ) : queue.map((r) => (
          <div key={r.id} className="lead mod-row">
            <div style={{ minWidth: 0 }}>
              <span className="pill pill--off">{KIND_LABELS[r.subjectKind]}</span>{' '}
              <Link href={PAGE[r.subjectKind](r.subjectId, slugOf.get(r.subjectId))} target="_blank" style={{ fontWeight: 600 }}>
                {r.subjectName || 'Profile'}
              </Link>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Sent by {r.requesterName || 'account'}{r.requesterEmail && ` · ${r.requesterEmail}`} · {fmtDate(r.createdAt)}
              </div>
              {r.note && <p className="muted small" style={{ margin: '6px 0 0' }}>“{r.note}”</p>}
              <div className="verify-docs">
                {r.documents.map((d) => (
                  d.url ? (
                    <a key={d.path} href={d.url} target="_blank" rel="noopener noreferrer" title={d.name}>
                      <Icon name="deed" size={15} /> <span>{DOC_LABELS[d.kind] ?? 'Document'} · {sizeLabel(d.size)}</span>
                    </a>
                  ) : (
                    <span key={d.path} className="pill pill--warn">{d.name}: file missing</span>
                  )
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn--sm btn--primary"
                onClick={() => setAsk({
                  title: `Verify ${r.subjectName}?`,
                  text: 'The verified badge appears on their profile right away. Your note, if any, goes into the log.',
                  confirmLabel: 'Verify',
                  onConfirm: (note) => act({ kind: 'request', id: r.id, decision: 'approved', note }, `${r.subjectName} verified`),
                })}>
                Approve
              </button>
              <button className="btn btn--sm btn--ghost"
                onClick={() => setAsk({
                  title: 'Send back to the applicant?',
                  text: 'They get your note by email and see it in their dashboard, then can send documents again.',
                  confirmLabel: 'Send back',
                  reasonRequired: true,
                  onConfirm: (note) => act({ kind: 'request', id: r.id, decision: 'rejected', note }, 'Sent back with your note'),
                })}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="panel">
          <h3 style={{ marginBottom: 10 }}>Recent decisions</h3>
          {recent.map((r) => (
            <div key={r.id} className="lead mod-row">
              <div style={{ minWidth: 0 }}>
                <span className={`pill ${r.status === 'approved' ? 'pill--on' : 'pill--warn'}`}>{r.status === 'approved' ? 'Verified' : 'Sent back'}</span>{' '}
                <span className="pill pill--off">{KIND_LABELS[r.subjectKind]}</span>{' '}
                <Link href={PAGE[r.subjectKind](r.subjectId, slugOf.get(r.subjectId))} target="_blank" style={{ fontWeight: 600 }}>{r.subjectName}</Link>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  {r.reviewedAt && fmtDate(r.reviewedAt)}{r.adminNote && ` · “${r.adminNote}”`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="fgroup__head">
          <h3>Developer badges</h3>
          <span className="muted small">{devs.filter((d) => d.verified).length} of {devs.length} verified</span>
        </div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Remove a badge when a company’s documents lapse, or set it by hand for a company you checked offline.
          Realtors and agencies have the same buttons in People and Agencies.
        </p>
        <input className="input" type="search" value={devQ} placeholder="Find a developer" onChange={(e) => setDevQ(e.target.value)}
          style={{ marginBottom: 10 }} />
        {shownDevs.map((d) => (
          <div key={d.id} className="lead mod-row">
            <div style={{ minWidth: 0 }}>
              <Link href={`/developers/${d.slug}`} target="_blank" style={{ fontWeight: 600 }}>{d.name}</Link>{' '}
              <span className={`pill ${d.verified ? 'pill--on' : 'pill--off'}`}>{d.verified ? 'Verified' : 'Unverified'}</span>
              {!d.hasOwner && <span className="tiny muted"> · no owner account</span>}
            </div>
            <button className={`btn btn--sm ${d.verified ? 'btn--ghost' : 'btn--primary'}`}
              onClick={() => setAsk({
                title: d.verified ? `Remove the badge from ${d.name}?` : `Verify ${d.name}?`,
                text: d.verified ? undefined : 'Confirm the company registration and representative ID have been checked.',
                confirmLabel: d.verified ? 'Unverify' : 'Verify',
                danger: d.verified,
                onConfirm: (reason) => act({ kind: 'developer', id: d.id, verified: !d.verified, reason },
                  d.verified ? 'Badge removed' : `${d.name} verified`),
              })}>
              {d.verified ? 'Unverify' : 'Verify'}
            </button>
          </div>
        ))}
      </div>

      <ConfirmAction ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}
