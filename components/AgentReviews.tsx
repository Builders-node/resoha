'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import type { Review } from '@/lib/types';

const Stars = ({ value, size = 15 }: { value: number; size?: number }) => (
  <span className="stars" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Icon key={n} name="star" size={size} className={`ico ${n <= value ? 'is-on' : ''}`} />
    ))}
  </span>
);

export default function AgentReviews({
  agentId, canReview, isSelf,
}: { agentId: string; canReview: boolean; isSelf: boolean }) {
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
    if (!res.ok) return toast((await res.json()).error ?? 'Could not save the review');
    toast('Thanks — your review is live');
    (e.target as HTMLFormElement).reset();
    load();
  }

  const average = items.length
    ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10
    : 0;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section__head">
        <h2>Reviews</h2>
        {items.length > 0 && (
          <span className="muted small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Stars value={Math.round(average)} /> {average} · {items.length} {items.length === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="muted small" style={{ marginTop: -6 }}>
          No reviews yet — the rating shows up once buyers start leaving them.
        </p>
      )}

      {items.map((r) => (
        <div key={r.id} className="lead">
          <div style={{ display: 'flex', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.authorAvatar && <img src={r.authorAvatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
            <div>
              <b>{r.authorName}</b> <Stars value={r.rating} />
              {r.body && <p className="muted small" style={{ margin: '6px 0 0' }}>{r.body}</p>}
              <div className="tiny muted" style={{ marginTop: 4 }}>{fmtDate(r.createdAt)}</div>
            </div>
          </div>
        </div>
      ))}

      {isSelf ? null : canReview ? (
        <form className="panel" style={{ marginTop: 18 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 10 }}>Worked with this agent?</h3>
          <div className="rate-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`rate-star ${n <= rating ? 'is-on' : ''}`}
                onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Icon name="star" size={26} />
              </button>
            ))}
            <span className="muted small">{rating} / 5</span>
          </div>
          <textarea className="input" name="body" rows={3} style={{ marginTop: 12 }}
            placeholder="How did the viewing and paperwork go?" />
          <button className="btn btn--primary" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? 'Saving…' : 'Post review'}
          </button>
        </form>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>
          <Link className="link-accent" href="/login">Sign in</Link> to leave a review.
        </p>
      )}
    </section>
  );
}
