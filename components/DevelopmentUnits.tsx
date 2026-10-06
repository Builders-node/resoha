import Link from 'next/link';
import { fmtNumber, fmtUsd } from '@/lib/format';
import { groupUnits, salesLabel, statusLabel, toM2, type SalesStatus } from '@/lib/units';
import type { Deal, Listing } from '@/lib/types';

const span = (r: [number, number] | null, fmt: (n: number) => string, unit = '') =>
  !r ? '—' : r[0] === r[1] ? `${fmt(r[0])}${unit}` : `${fmt(r[0])} – ${fmt(r[1])}${unit}`;
const m2 = (n: number) => String(Math.round(n * 10) / 10);
/** $107K, $1.2M — у рядках зведення, як «від 2.4 млн» у забудовників */
const short = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(v / 1_000)}K`);
const money = (v: number, deal: Deal) => (deal === 'rent' ? `${fmtUsd(v)}/mo` : fmtUsd(v));

/**
 * Блок «як у забудовника»: шапка з забудовником і запитом, термін здачі, стан продажів,
 * рядок на тип квартир із діапазонами, а по кліку — список квартир із посиланнями.
 * Окремо для продажу й оренди. Без клієнтського JS: розкриття тримає <details>.
 */
export default function DevelopmentUnits({ units, buildings, developer, completion, sales, contactHref }: {
  units: Listing[];
  /** id → назва дому; лише коли домів кілька — тоді в таблиці зʼявляється колонка «Building» */
  buildings?: Record<string, string>;
  developer: string;
  completion: string;
  sales: SalesStatus;
  contactHref: string;
}) {
  const deals = (['sale', 'rent'] as Deal[]).filter((d) => units.some((u) => u.deal === d));

  return (
    <div className="dev__box">
      <div className="dev__head">
        <span className="muted">
          {developer ? <>Project by <b className="dev__by">{developer}</b></> : 'New development'}
        </span>
        <a className="btn dev__ask" href={contactHref}>Ask about prices &amp; availability</a>
      </div>

      <div className="dev__body">
        <div className="dev__top">
          {completion && (
            <div className="dev__field"><span className="tiny muted">Completion</span><b>{completion}</b></div>
          )}
          <span className={`dev__status dev__status--${sales}`}>
            <i aria-hidden /> {salesLabel(sales)}
          </span>
        </div>

        {!units.length && <p className="muted" style={{ padding: '16px 0' }}>Units and prices are coming soon.</p>}

        {deals.map((deal) => {
          const list = units.filter((u) => u.deal === deal);
          const groups = groupUnits(list);
          const perM2 = deal === 'sale' ? groups.flatMap((g) => (g.perM2 ? [g.perM2[0]] : [])) : [];
          return (
            <div key={deal} className="dev__deal">
              <div className="dev__dealhead">
                <h3>{deal === 'sale' ? 'For sale' : 'For rent'}</h3>
                {perM2.length > 0 && <b className="dev__ppm">from {fmtUsd(Math.min(...perM2))}/m²</b>}
                <span className="tiny muted">{list.filter((u) => u.status === 'available').length} of {list.length} available</span>
              </div>
              {groups.map((g) => (
                <details key={g.beds} className="dev__row">
                  <summary>
                    <b className="dev__type">{g.label}</b>
                    <span className="dev__size">
                      {span(g.m2, m2, ' m²')}
                      {g.sqft && <span className="tiny muted">{span(g.sqft, fmtNumber, ' ft²')}</span>}
                    </span>
                    <span className="dev__per">{deal === 'sale' ? span(g.perM2, fmtNumber, ' $/m²') : ''}</span>
                    <b className="dev__from">from {deal === 'sale' ? short(g.from) : money(g.from, deal)}</b>
                    <span className="dev__count tiny muted">{g.available} of {g.units.length} open</span>
                    <svg className="dev__chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="units__wrap">
                    <table className="units__table">
                      <thead>
                        <tr><th>Unit</th>{buildings && <th>Building</th>}<th>Floor</th><th>Size</th>{deal === 'sale' && <th className="units__ppm">$/m²</th>}<th className="units__num">Price</th></tr>
                      </thead>
                      <tbody>
                        {g.units.map((u) => (
                          <tr key={u.id} className={u.status === 'sold' || u.status === 'rented' ? 'is-sold' : undefined}>
                            <td><Link href={`/listings/${u.id}`} className="units__link"><b>{u.unitNo || '—'}</b></Link></td>
                            {buildings && <td>{(u.buildingId && buildings[u.buildingId]) || '—'}</td>}
                            <td>{u.floor ?? '—'}</td>
                            <td>
                              {u.sqft > 0 ? <>{toM2(u.sqft)} m²<span className="muted"> · {fmtNumber(u.sqft)} ft²</span></> : '—'}
                            </td>
                            {deal === 'sale' && <td className="units__ppm">{u.sqft > 0 ? fmtNumber(Math.round(u.price / toM2(u.sqft))) : '—'}</td>}
                            <td className="units__num">
                              <Link href={`/listings/${u.id}`} className="units__link">
                                {u.status === 'available' ? <b>{money(u.price, deal)}</b> : <span className="muted">{statusLabel(u.status)}</span>}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
