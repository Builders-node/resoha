'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmAction, { type Ask } from './ConfirmAction';
import Icon from './Icon';
import Photo from './Photo';
import { toast } from './Toaster';
import { DEAL_LABELS, fmtDate, fmtPrice } from '@/lib/format';
import type { Listing, ListingReport, ReportReason } from '@/lib/types';

export const REASON_LABELS: Record<ReportReason, string> = {
  sold: 'Already sold or rented',
  wrong_price: 'Wrong price',
  wrong_info: 'Wrong details or location',
  photos: 'Photos don’t match',
  scam: 'Looks like a scam',
  duplicate: 'Duplicate listing',
  other: 'Something else',
};

/**
 * Модерація в адмінці: нові оголошення неперевірених ріелторів і можливі дублі —
 * схвалити чи повернути з поясненням; скарги покупців — закрити, відхилити або зняти обʼєкт.
 */
export default function ModerationAdmin() {
  const [queue, setQueue] = useState<Listing[]>([]);
  const [originals, setOriginals] = useState<Listing[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(true);
  const [ask, setAsk] = useState<Ask | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const d = await fetch('/api/admin/moderation').then((r) => r.json()).catch(() => ({}));
    setQueue(d.queue ?? []);
    setOriginals(d.originals ?? []);
    setReports(d.reports ?? []);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, message: string) {
    const res = await fetch('/api/admin/moderation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? message : d.error ?? 'Not allowed');
    load();
  }

  const original = useMemo(() => new Map(originals.map((l) => [l.id, l])), [originals]);
  const openReports = reports.filter((r) => r.status === 'open');
  const shownReports = showAll ? reports : openReports;

  return (
    <>
      <div className="panel">
        <div className="fgroup__head">
          <h3>Listings waiting for review</h3>
          <span className="muted small">{busy ? 'Loading…' : `${queue.length} waiting`}</span>
        </div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Verified realtors publish straight away. Listings from everyone else, and anything that looks like a copy
          of an existing listing, wait here. Buyers don’t see them until you approve.
        </p>
        {queue.length === 0 ? (
          <div className="empty"><div className="empty__ico"><Icon name="check" size={40} /></div>
            {busy ? 'Loading…' : 'Nothing to review'}</div>
        ) : queue.map((l) => {
          const dup = l.duplicateOf ? original.get(l.duplicateOf) : null;
          return (
            <div key={l.id} className="lead mod-row">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                <Photo className="thumb" src={l.photos[0]} label="" />
                <div style={{ minWidth: 0 }}>
                  <Link href={`/listings/${l.id}`} target="_blank" style={{ fontWeight: 600 }}>{l.title}</Link>
                  <div className="tiny muted">
                    {fmtPrice(l.price, l.deal)} · {DEAL_LABELS[l.deal]} · {l.neighborhood} · {l.photos.length} photos · sent {fmtDate(l.updatedAt)}
                  </div>
                  {l.duplicateOf && (
                    <div className="small mod-dup">
                      <Icon name="flag" size={14} /> Looks like a duplicate of{' '}
                      <Link href={`/listings/${l.duplicateOf}`} target="_blank" className="link-accent">
                        {dup ? `${dup.title} · ${fmtPrice(dup.price, dup.deal)}` : 'another listing'}
                      </Link>
                      {dup && dup.agentId === l.agentId && ' (same realtor)'}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn--sm btn--primary"
                  onClick={() => act({ kind: 'review', id: l.id, decision: 'approved' }, 'Approved — the listing is live')}>
                  Approve
                </button>
                <button className="btn btn--sm btn--ghost"
                  onClick={() => setAsk({
                    title: 'Send back to the realtor?',
                    text: 'The listing stays hidden. Your note goes to the realtor by email and appears next to the listing in their dashboard.',
                    confirmLabel: 'Send back',
                    reasonRequired: true,
                    onConfirm: (note) => act({ kind: 'review', id: l.id, decision: 'rejected', note }, 'Sent back to the realtor'),
                  })}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="fgroup__head">
          <h3>Reports from buyers</h3>
          <span className="muted small">
            {busy ? 'Loading…' : `${openReports.length} open`}
            {reports.length > openReports.length && (
              <> · <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Open only' : `Show all ${reports.length}`}</button></>
            )}
          </span>
        </div>
        {shownReports.length === 0 ? (
          <div className="empty"><div className="empty__ico"><Icon name="flag" size={40} /></div>
            {busy ? 'Loading…' : 'No open reports'}</div>
        ) : shownReports.map((r) => (
          <div key={r.id} className="lead mod-row">
            <div style={{ minWidth: 0 }}>
              <span className={`pill ${r.reason === 'scam' ? 'pill--warn' : 'pill--off'}`}>{REASON_LABELS[r.reason] ?? r.reason}</span>{' '}
              <Link href={`/listings/${r.listingId}`} target="_blank" style={{ fontWeight: 600 }}>{r.listingTitle || 'Listing'}</Link>
              {!r.listingActive && <span className="pill pill--off" style={{ marginLeft: 6 }}>Hidden</span>}
              {r.message && <p className="muted small" style={{ margin: '6px 0 0' }}>“{r.message}”</p>}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {r.email || 'No email'} · {fmtDate(r.createdAt)}{r.status !== 'open' && ` · ${r.status}`}
              </div>
            </div>
            {r.status === 'open' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {r.listingActive && (
                  <button className="btn btn--sm btn--danger"
                    onClick={() => setAsk({
                      title: 'Hide this listing?',
                      text: 'It drops out of search and its page stops opening for buyers. The realtor can see it in their dashboard.',
                      confirmLabel: 'Hide listing',
                      danger: true,
                      reasonRequired: true,
                      onConfirm: (reason) => act({ kind: 'report', id: r.id, status: 'resolved', hideListing: true, reason, targetName: r.listingTitle }, 'Listing hidden, report closed'),
                    })}>
                    Hide listing
                  </button>
                )}
                <button className="btn btn--sm btn--ghost"
                  onClick={() => act({ kind: 'report', id: r.id, status: 'resolved', targetName: r.listingTitle }, 'Report closed')}>
                  Resolved
                </button>
                <button className="btn btn--sm btn--ghost"
                  onClick={() => act({ kind: 'report', id: r.id, status: 'dismissed', targetName: r.listingTitle }, 'Report dismissed')}>
                  Dismiss
                </button>
              </div>
            ) : (
              <button className="btn btn--sm btn--ghost"
                onClick={() => act({ kind: 'report', id: r.id, status: 'open', targetName: r.listingTitle }, 'Report reopened')}>
                Reopen
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmAction ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}
