'use client';
import Link from 'next/link';
import Icon from './Icon';
import Photo from './Photo';
import { useLang, useT } from './LangProvider';
import { TYPE_LABELS, fmtArea, fmtNumber } from '@/lib/format';
import { COMPARE_KEY, COMPARE_MAX, useIds, writeIds } from '@/lib/localLists';
import { useListingsByIds } from '@/lib/useListingsByIds';
import type { Listing } from '@/lib/types';
import type { Lang, T } from '@/lib/i18n';
import { useMoney } from './CurrencyProvider';
import type { Money } from '@/lib/currency';

const SQM_PER_ACRE = 4046.86;

/** Рядки таблиці: підпис і значення для одного обʼєкта. Порожнє — тире. */
const ROWS: [label: string, value: (l: Listing, t: T, lang: Lang, money: Money) => string][] = [
  ['Price', (l, _t, lang, money) => money.price(l.price, l.deal, lang)],
  ['Price per area', (l, _t, _lang, money) => (l.deal === 'sale' && l.sqft > 0 ? money.perArea(l.price, l.sqft) : '')],
  ['Type', (l, t) => `${t(TYPE_LABELS[l.type])} · ${t(l.deal === 'rent' ? 'For rent' : 'For sale')}`],
  ['Bedrooms', (l, t) => (l.type === 'land' ? '' : l.beds > 0 ? String(l.beds) : t('Studio'))],
  ['Bathrooms', (l) => (l.baths ? String(l.baths) : '')],
  ['Interior', (l) => (l.sqft > 0 ? fmtArea(l.sqft) : '')],
  ['Lot size', (l, t) => (l.lotAcres > 0
    ? `${t('{n} ac', { n: l.lotAcres })} · ${fmtNumber(Math.round(l.lotAcres * SQM_PER_ACRE))} m²` : '')],
  ['HOA', (l, t, _lang, money) => (l.hoa > 0 ? `${money.amount(l.hoa)}${t('/mo')}` : t('None'))],
  ['Year built', (l) => (l.year ? String(l.year) : '')],
  ['Oceanfront', (l, t) => (l.oceanfront ? t('Yes') : t('No'))],
  // як на сторінці обʼєкта: заповнений паспорт ділянки важить більше за старий прапорець
  ['Titled', (l, t) => ((l.land?.checkedAt ? l.land.titleStatus === 'registered' : l.titled) ? t('Yes') : t('Not confirmed'))],
  ['Owner financing', (l, t) => (l.ownerFinancing ? t('Yes') : t('No'))],
  ['Neighborhood', (l) => l.neighborhood],
];

export default function CompareTable() {
  const t = useT();
  const lang = useLang();
  const money = useMoney();
  const ids = useIds(COMPARE_KEY);
  const { items, loading } = useListingsByIds(ids);
  const remove = (id: string) => writeIds(COMPARE_KEY, ids.filter((x) => x !== id));

  // найнижча ціна за площу серед продажів — підсвічуємо, як «найвигідніше» в LUN
  const perArea = items.filter((l) => l.deal === 'sale' && l.sqft > 0).map((l) => l.price / l.sqft);
  const bestPerArea = perArea.length > 1 ? Math.min(...perArea) : null;

  return (
    <div className="wrap page-top section">
      <div className="section__head">
        <h1 style={{ fontSize: 'var(--fs-h1)' }}>{t('Compare listings')}</h1>
        {ids.length > 0 && <button className="btn btn--ghost btn--sm" onClick={() => writeIds(COMPARE_KEY, [])}>{t('Clear all')}</button>}
        <p>{t('Up to {n} listings side by side. Add them with the compare button on any card or listing page.', { n: COMPARE_MAX })}</p>
      </div>

      {ids.length === 0 ? (
        <div className="empty">
          <div className="empty__ico"><Icon name="compare" size={40} /></div>
          <p>{t('Nothing to compare yet.')}</p>
          <Link className="btn btn--primary" href="/listings?deal=sale">{t('Browse the listings')}</Link>
        </div>
      ) : loading && items.length === 0 ? (
        <p className="muted">{t('Loading…')}</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>{t('These listings are no longer on the market.')}</p>
          <button className="btn btn--primary" onClick={() => writeIds(COMPARE_KEY, [])}>{t('Clear all')}</button>
        </div>
      ) : (
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">{t('Listing')}</span></th>
                {items.map((l) => (
                  <th key={l.id} scope="col">
                    <div className="cmp-table__card">
                      <Link href={`/listings/${l.id}`} className="cmp-table__photo"><Photo src={l.photos[0]} alt={l.title} /></Link>
                      <button className="cmp-table__rm" onClick={() => remove(l.id)} aria-label={t('Remove from compare')} title={t('Remove from compare')}>
                        <Icon name="close" size={16} />
                      </button>
                      <Link href={`/listings/${l.id}`} className="cmp-table__title">{l.title}</Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{t(label)}</th>
                  {items.map((l) => {
                    const v = value(l, t, lang, money);
                    const best = label === 'Price per area' && bestPerArea !== null && l.deal === 'sale' && l.sqft > 0
                      && l.price / l.sqft === bestPerArea;
                    return <td key={l.id} className={best ? 'is-best' : ''}>{v || '—'}</td>;
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row"><span className="sr-only">{t('Open listing')}</span></th>
                {items.map((l) => (
                  <td key={l.id}>
                    <Link className="btn btn--primary btn--sm" href={`/listings/${l.id}`}>{t('Open listing')} <Icon name="arrowRight" size={15} /></Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
