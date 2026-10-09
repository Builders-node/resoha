'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import type { ReportReason } from '@/lib/types';

const REASONS: [ReportReason, string][] = [
  ['sold', 'Already sold or rented'],
  ['wrong_price', 'Wrong price'],
  ['wrong_info', 'Wrong details or location'],
  ['photos', 'Photos don’t match'],
  ['duplicate', 'Duplicate listing'],
  ['scam', 'Looks like a scam'],
  ['other', 'Something else'],
];

/** «Поскаржитись»: причина, коментар і (необовʼязково) email — скарга йде модератору. */
export default function ReportListing({ listingId, email }: { listingId: string; email?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const openedAt = useRef(0);

  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) return;
    const fd = new FormData(e.currentTarget);
    setSending(true);
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId, reason, message: fd.get('message'), email: fd.get('email'),
        website: fd.get('website'), ts: openedAt.current,
      }),
    });
    setSending(false);
    if (res.ok) setSent(true);
    else toast((await res.json().catch(() => ({}))).error ?? t('Something went wrong'));
  }

  return (
    <>
      <button type="button" className="cc__link" onClick={() => setOpen(true)}>
        <Icon name="flag" size={20} /> <span>{t('Report listing')}</span>
      </button>
      {open && (
        <div className="modal is-open" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal__box modal__box--sm" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <h3 id="report-title" style={{ fontSize: 20 }}>{t('Report listing')}</h3>
            {sent ? (
              <>
                <p className="small note-ok" style={{ marginTop: 12 }}>
                  <Icon name="check" size={16} className="ico ico--ok" /> {t('Thank you. Our team checks every report and fixes or removes the listing if needed.')}
                </p>
                <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={() => setOpen(false)}>{t('Close')}</button>
              </>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                <p className="muted small" style={{ margin: 0 }}>{t('What’s wrong with this listing? The agent doesn’t see who reported it.')}</p>
                <div className="report-reasons" role="radiogroup" aria-label={t('Reason')}>
                  {REASONS.map(([k, label]) => (
                    <label key={k} className={`report-reason ${reason === k ? 'is-on' : ''}`}>
                      <input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
                      {t(label)}
                    </label>
                  ))}
                </div>
                <textarea className="input" name="message" rows={3} maxLength={2000}
                  placeholder={reason === 'sold' ? t('When was it sold? How do you know?') : t('Details help us check faster (optional)')} />
                <input className="input" name="email" type="email" maxLength={200} defaultValue={email ?? ''}
                  placeholder={t('Your email, if we may follow up (optional)')} />
                <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t('Cancel')}</button>
                  <button className="btn btn--primary" disabled={!reason || sending}>{sending ? t('Sending…') : t('Send report')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
