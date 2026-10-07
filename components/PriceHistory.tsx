'use client';
import { fmtDate, fmtPrice, fmtPriceShort } from '@/lib/format';
import { useLang, useT } from './LangProvider';
import type { Deal, PricePoint } from '@/lib/types';

/**
 * Історія ціни, як у LUN: ступінчастий графік і список змін з різницею.
 * Беремо лише точки поточної угоди — ціна продажу й оренди не порівнюються.
 */
export default function PriceHistory({ points, deal, price, since }: {
  points: PricePoint[]; deal: Deal; price: number; since: string;
}) {
  const t = useT();
  const lang = useLang();
  // сусідні однакові ціни — не зміна
  const steps: PricePoint[] = [];
  for (const p of points.filter((x) => x.deal === deal)) {
    if (steps.at(-1)?.price !== p.price) steps.push(p);
  }
  if (!steps.length) steps.push({ price, deal, at: since });

  if (steps.length < 2) {
    return (
      <p className="muted" style={{ marginTop: 8 }}>
        {t('The price hasn’t changed since {date}.', { date: fmtDate(steps[0].at, lang) })}
      </p>
    );
  }

  const W = 600, H = 120, PAD = 8;
  const t0 = new Date(steps[0].at).getTime();
  // хвіст після останньої зміни — щоб остання ціна теж читалась як відрізок
  const tl = new Date(steps.at(-1)!.at).getTime();
  const t1 = tl + Math.max((tl - t0) * 0.2, 86_400_000);
  const lo = Math.min(...steps.map((s) => s.price));
  const hi = Math.max(...steps.map((s) => s.price));
  const x = (iso: string) => PAD + ((new Date(iso).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PAD * 2);
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / (hi - lo)) * (H - PAD * 2));
  let d = `M${x(steps[0].at)},${y(steps[0].price)}`;
  for (const s of steps.slice(1)) d += ` H${x(s.at)} V${y(s.price)}`;
  d += ` H${W - PAD}`;

  const rows = steps.map((s, i) => ({ ...s, prev: i ? steps[i - 1].price : null })).reverse();

  return (
    <div className="ph">
      <svg className="ph__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={t('Price went from {from} to {to}', { from: fmtPriceShort(steps[0].price, deal, lang), to: fmtPriceShort(steps.at(-1)!.price, deal, lang) })}>
        <path d={d} fill="none" stroke="var(--orange)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className="ph__list">
        {rows.map((r) => {
          const diff = r.prev === null ? 0 : r.price - r.prev;
          const pct = r.prev ? Math.round((diff / r.prev) * 1000) / 10 : 0;
          return (
            <li key={r.at}>
              <span className="muted">{fmtDate(r.at, lang)}</span>
              <span>
                <b>{fmtPrice(r.price, deal, lang)}</b>
                {r.prev === null ? <span className="muted small"> · {t('listed')}</span>
                  : <span className={diff < 0 ? 'ph__down' : 'ph__up'}> {diff < 0 ? '↓' : '↑'} {Math.abs(pct)}%</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
