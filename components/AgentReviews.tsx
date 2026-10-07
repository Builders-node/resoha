'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthLink from './AuthLink';
import Icon from './Icon';
import { useLang, useT } from './LangProvider';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import type { Review } from '@/lib/types';

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const t = useT();
  return (
    <span className="stars" aria-label={t('{n} out of 5', { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} className={`ico ${n <= value ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}

export default function AgentReviews({
  agentId, canReview, signedIn, isSelf,
}: { agentId: string; canReview: boolean; signedIn: boolean; isSelf: boolean }) {
  const t = useT();
  const lang = useLang();
  const [items, setItems] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch(`/api/reviews?agentId=${agentId}`).then((r) => r.json());
    setItems(d.items ?? []);
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = new FormData(e.currentTarget).get('body');
    setBusy(true);
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, rating, body }),
    });
    setBusy(false);
    if (!res.ok) return toast(t((await res.json()).error ?? 'Could not save the review'));
    toast(t('Thanks — your review is live'));
    (e.target as HTMLFormElement).reset();
    load();
  }

  const average = items.length
    ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10
    : 0;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section__head">
        <h2>{t('Reviews')}</h2>
        {items.length > 0 && (
          <span className="muted small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Stars value={Math.round(average)} /> {average} · {t(items.length === 1 ? '{n} review' : '{n} reviews', { n: items.length })}
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="muted small" style={{ marginTop: -6 }}>
          {t('No reviews yet — the rating shows up once buyers start leaving them.')}
        </p>
      )}

      {items.map((r) => (
        <div key={r.id} className="lead">
          <div style={{ display: 'flex', gap: 12 }}>
            {r.authorAvatar && <img src={r.authorAvatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
            <div>
              <b>{r.authorName}</b> <Stars value={r.rating} />
              {r.body && <p className="muted small" style={{ margin: '6px 0 0' }}>{r.body}</p>}
              <div className="tiny muted" style={{ marginTop: 4 }}>{fmtDate(r.createdAt, lang)}</div>
            </div>
          </div>
        </div>
      ))}

      {isSelf ? null : canReview ? (
        <form className="panel" style={{ marginTop: 18 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 10 }}>{t('Worked with this agent?')}</h3>
          <div className="rate-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`rate-star ${n <= rating ? 'is-on' : ''}`}
                onClick={() => setRating(n)} aria-label={t(n === 1 ? '{n} star' : '{n} stars', { n })}>
                <Icon name="star" size={26} />
              </button>
            ))}
            <span className="muted small">{rating} / 5</span>
          </div>
          <textarea className="input" name="body" rows={3} style={{ marginTop: 12 }}
            placeholder={t('How did the viewing and paperwork go?')} />
          <button className="btn btn--primary" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? t('Saving…') : t('Post review')}
          </button>
        </form>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>
          {signedIn
            ? t('Reviews come from buyers who have contacted this agent — send an enquiry on one of their listings first.')
            : <><AuthLink className="link-accent">{t('Sign in')}</AuthLink> {t('to leave a review.')}</>}
        </p>
      )}
    </section>
  );
}
