import Link from 'next/link';
import { fmtNumber } from '@/lib/format';
import { SQFT_PER_M2, groupUnits, salesLabel, statusLabel, toM2, type SalesStatus } from '@/lib/units';
import type { Deal, Listing } from '@/lib/types';
import { getT } from '@/lib/i18n/server';
import { getMoney } from '@/lib/currencyServer';

const span = (r: [number, number] | null, fmt: (n: number) => string, unit = '') =>
  !r ? '—' : r[0] === r[1] ? `${fmt(r[0])}${unit}` : `${fmt(r[0])} – ${fmt(r[1])}${unit}`;
const m2 = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Блок «як у забудовника»: шапка з забудовником і запитом, термін здачі, стан продажів,
 * рядок на тип квартир із діапазонами, а по кліку — список квартир із посиланнями.
 * Окремо для продажу й оренди. Без клієнтського JS: розкриття тримає <details>.
 */
export default async function DevelopmentUnits({ units, buildings, developer, developerHref, completion, sales, contactHref }: {
  units: Listing[];
  /** id → назва дому; лише коли домів кілька — тоді в таблиці зʼявляється колонка «Building» */
  buildings?: Record<string, string>;
  developer: string;
  /** сторінка забудовника, якщо в ЖК обрано його профіль */
  developerHref?: string;
  completion: string;
  sales: SalesStatus;
  contactHref: string;
}) {
  const [t, money] = await Promise.all([getT(), getMoney()]);
  const deals = (['sale', 'rent'] as Deal[]).filter((d) => units.some((u) => u.deal === d));
  /** $107K, $1.2M — у рядках зведення, як «від 2.4 млн» у забудовників */
  const price = (v: number, deal: Deal) => (deal === 'rent' ? `${money.amount(v)}${t('/mo')}` : money.amount(v));
  /** ціна за m² у валюті показу, без символу — символ стоїть у заголовку колонки */
  const per = (usd: number) => fmtNumber(Math.round(money.fromUsd(usd)));
  const perUnit = `${money.symbol.trim()}/m²`;
  const groupName = (beds: number) => t(beds === 0 ? 'Studios' : beds === 1 ? '1 bedroom' : '{n} bedrooms', { n: beds });

  return (
    <div className="dev__box">
      <div className="dev__boxhead">
        <span className="muted">
          {developer ? <>{t('Project by')} {developerHref
            ? <Link href={developerHref}><b className="dev__by">{developer}</b></Link>
            : <b className="dev__by">{developer}</b>}</> : t('New development')}
        </span>
        <a className="btn dev__ask" href={contactHref}>{t('Ask about prices & availability')}</a>
      </div>

      <div className="dev__body">
        <div className="dev__top">
          {completion && (
            <div className="dev__field"><span className="tiny muted">{t('Completion')}</span><b>{completion}</b></div>
          )}
          <span className={`dev__status dev__status--${sales}`}>
            <i aria-hidden /> {t(salesLabel(sales))}
          </span>
        </div>

        {!units.length && <p className="muted" style={{ padding: '16px 0' }}>{t('Units and prices are coming soon.')}</p>}

        {deals.map((deal) => {
          const list = units.filter((u) => u.deal === deal);
          const groups = groupUnits(list);
          const perM2 = deal === 'sale' ? groups.flatMap((g) => (g.perM2 ? [g.perM2[0]] : [])) : [];
          return (
            <div key={deal} className="dev__deal">
              <div className="dev__dealhead">
                <h3>{t(deal === 'sale' ? 'For sale' : 'For rent')}</h3>
                {perM2.length > 0 && (
                  <b className="dev__ppm">
                    {t('from {price}', { price: money.amount(Math.min(...perM2)) })}/m²{' '}
                    <span className="muted">· {money.bare(Math.round(Math.min(...perM2) / SQFT_PER_M2))}/ft²</span>
                  </b>
                )}
                <span className="tiny muted">
                  {t('{n} of {total} available', { n: list.filter((u) => u.status === 'available').length, total: list.length })}
                </span>
              </div>
              {groups.map((g) => (
                <details key={g.beds} className="dev__row">
                  <summary>
                    <b className="dev__type">{groupName(g.beds)}</b>
                    <span className="dev__size">
                      {span(g.m2, m2, ' m²')}
                      {g.sqft && <span className="tiny muted">{span(g.sqft, fmtNumber, ' ft²')}</span>}
                    </span>
                    <span className="dev__per">{deal === 'sale' ? span(g.perM2, per, ` ${perUnit}`) : ''}</span>
                    <b className="dev__from">
                      {t('from {price}', { price: deal === 'sale' ? money.short(g.from) : price(g.from, deal) })}
                    </b>
                    <span className="dev__count tiny muted">{t('{n} of {total} open', { n: g.available, total: g.units.length })}</span>
                    <svg className="dev__chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="units__wrap">
                    <table className="units__table">
                      <thead>
                        <tr>
                          <th>{t('Unit')}</th>{buildings && <th>{t('Building')}</th>}<th>{t('Floor')}</th><th>{t('Size')}</th>
                          {deal === 'sale' && <th className="units__ppm">{perUnit}</th>}<th className="units__num">{t('Price')}</th>
                        </tr>
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
                            {deal === 'sale' && <td className="units__ppm">{u.sqft > 0 ? per(Math.round(u.price / toM2(u.sqft))) : '—'}</td>}
                            <td className="units__num">
                              <Link href={`/listings/${u.id}`} className="units__link">
                                {u.status === 'available' ? <b>{price(u.price, deal)}</b> : <span className="muted">{t(statusLabel(u.status))}</span>}
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
