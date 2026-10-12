'use client';
import Link from 'next/link';
import { useT } from './LangProvider';
import { useLp } from './useLp';

/** Адреса сторінки каталогу: page=1 не пишемо, щоб у першої сторінки була одна адреса. */
export function catalogHref(qs: string, page: number) {
  const p = new URLSearchParams(qs);
  p.delete('page');
  if (page > 1) p.set('page', String(page));
  const s = p.toString();
  return `/listings${s ? `?${s}` : ''}`;
}

/** Які номери сторінок показати: перша, остання і сусіди поточної; null — «…» */
function pageList(current: number, last: number): (number | null)[] {
  const want = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
  const out: (number | null)[] = [];
  let prev = 0;
  for (const n of [...want].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Сторінки каталогу для пошуковиків і для тих, хто без JS: справжні посилання ?page=N.
 * «Показати ще» — теж посилання на наступну сторінку; з JS воно дозавантажує список на місці.
 * Номери тут 1-based, як в адресі.
 */
export default function CatalogPager({ qs, first, last, pages, left, more, loading, onMore }: {
  qs: string;
  /** перша й остання показані сторінки (дозавантаження додає сторінки в кінець) */
  first: number;
  last: number;
  pages: number;
  left: number;
  /** чи є що дозавантажувати (з відповіді API) */
  more: boolean;
  loading: boolean;
  onMore: () => void;
}) {
  const t = useT();
  const lp = useLp();
  if (pages <= 1) return null;
  const next = more && last < pages ? last + 1 : null;

  return (
    <div className="cpager">
      {next && (
        <a className="btn btn--ghost btn--lg cpager__more" href={lp(catalogHref(qs, next))} rel="next"
          aria-disabled={loading}
          onClick={(e) => {
            // звичайний клік — дозавантаження на місці; з Ctrl/Cmd хай відкриває сторінку
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            if (!loading) onMore();
          }}>
          {loading ? t('Loading…') : t('Show more — {n} left', { n: left })}
        </a>
      )}
      <nav className="cpager__nav" aria-label={t('Pages')}>
        {first > 1 && (
          <Link className="cpager__step" href={lp(catalogHref(qs, first - 1))} rel="prev">← {t('Previous')}</Link>
        )}
        {pageList(last, pages).map((n, i) => n === null
          ? <span key={`gap-${i}`} className="cpager__gap">…</span>
          : n >= first && n <= last
            ? <span key={n} className="cpager__num is-on" aria-current={n === last ? 'page' : undefined}>{n}</span>
            : <Link key={n} className="cpager__num" href={lp(catalogHref(qs, n))}>{n}</Link>)}
        {next && (
          <Link className="cpager__step" href={lp(catalogHref(qs, next))}>{t('Next')} →</Link>
        )}
      </nav>
    </div>
  );
}
