'use client';
import { useT } from './LangProvider';

/** Номери сторінок: до 7 — усі, далі перша, остання і сусіди поточної, решта — «…» */
export default function Pager({ page, count, onGo }: { page: number; count: number; onGo: (p: number) => void }) {
  const t = useT();
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= count; p++) {
    if (count <= 7 || p === 1 || p === count || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pager" aria-label={t('Pages')}>
      <button type="button" className="pager__btn" disabled={page === 1} onClick={() => onGo(page - 1)} aria-label={t('Previous page')}>‹</button>
      {nums.map((p, i) => p === '…'
        ? <span key={`gap${i}`} className="pager__gap">…</span>
        : <button key={p} type="button" className={`pager__btn ${p === page ? 'is-on' : ''}`}
            aria-current={p === page ? 'page' : undefined} onClick={() => onGo(p)}>{p}</button>)}
      <button type="button" className="pager__btn" disabled={page === count} onClick={() => onGo(page + 1)} aria-label={t('Next page')}>›</button>
    </nav>
  );
}
