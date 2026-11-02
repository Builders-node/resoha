'use client';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
import { regionByName } from '@/lib/regions';
import { AIRDNA, RENTAL_GUIDE, defaultInputs, rentalYield, type RentMode, type YieldInputs } from '@/lib/rentalYield';

const pct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString('en-US')}%`;

/**
 * Калькулятор дохідності здачі: ставка за ніч × завантаження (або місячна оренда)
 * мінус керування, платформа, HOA, комуналка, страховка й податки. Суми — у валюті показу,
 * рахуємо в доларах. editablePrice — для окремої сторінки, де ціни оголошення немає.
 */
export default function RentalYieldCalculator({ price, hoa = 0, island = '', house = false, editablePrice = false, id: anchor = 'yield' }: {
  price: number; hoa?: number; island?: string; house?: boolean; editablePrice?: boolean; id?: string;
}) {
  const t = useT();
  const money = useMoney();
  const uid = useId();
  const mainland = island !== '' && regionByName(island)?.slug !== 'roatan';
  const [v, setV] = useState<YieldInputs>(() => defaultInputs(price, hoa, { house, mainland }));
  const r = useMemo(() => rentalYield(v), [v]);

  const set = (patch: Partial<YieldInputs>) => setV((s) => ({ ...s, ...patch }));
  const n = (s: string) => {
    const x = Number(s.replace(',', '.'));
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };
  // поля з грошима показуємо у валюті показу, а зберігаємо в доларах
  const usdField = (key: 'price' | 'nightly' | 'monthlyRent' | 'hoa' | 'upkeep', label: string, hint?: string, step = 10) => (
    <div className="field">
      <label htmlFor={`${uid}-${key}`}>{t(label)}</label>
      <span className="calc__inline">
        <span className="muted small">{money.symbol.trim()}</span>
        <input id={`${uid}-${key}`} className="input" type="number" inputMode="decimal" min={0} step={step}
          value={Math.round(money.fromUsd(v[key]))} onChange={(e) => set({ [key]: money.toUsd(n(e.target.value)) })} />
      </span>
      {hint && <span className="tiny muted">{t(hint)}</span>}
    </div>
  );
  const pctField = (key: 'occupancy' | 'management' | 'platform' | 'insurance' | 'propertyTax' | 'incomeTax', label: string, hint?: string, step = 1) => (
    <div className="field">
      <label htmlFor={`${uid}-${key}`}>{t(label)}</label>
      <span className="calc__inline">
        <input id={`${uid}-${key}`} className="input" type="number" inputMode="decimal" min={0} max={100} step={step}
          value={v[key]} onChange={(e) => set({ [key]: Math.min(100, n(e.target.value)) })} />
        <span className="muted small">%</span>
      </span>
      {hint && <span className="tiny muted">{t(hint)}</span>}
    </div>
  );
  const mode = (m: RentMode) => (
    <button type="button" className={`chip-btn ${v.mode === m ? 'is-on' : ''}`} aria-pressed={v.mode === m} onClick={() => set({ mode: m })}>
      {t(m === 'nightly' ? 'Holiday rental' : 'Long-term rental')}
    </button>
  );

  return (
    <section className="calc yield" id={anchor}>
      <h3 className="prop__h">{t('Rental income calculator')}</h3>
      <div className="calc__grid">
        <div className="calc__card">
          <div className="chip-row calc__presets" role="group" aria-label={t('Rental type')}>
            {mode('nightly')}
            {mode('monthly')}
          </div>
          <div className="calc__inputs yield__inputs">
            {editablePrice && usdField('price', 'Purchase price', undefined, 5000)}
            {v.mode === 'nightly' ? (
              <>
                {usdField('nightly', 'Nightly rate', 'Roatán average ≈ $209 (AirDNA)')}
                {pctField('occupancy', 'Occupancy', 'Roatán average 43% (AirDNA)')}
                {pctField('platform', 'Booking platform fees')}
              </>
            ) : (
              <>
                {usdField('monthlyRent', 'Monthly rent', 'Your estimate: ask local agents', 50)}
                <div className="field">
                  <label htmlFor={`${uid}-months`}>{t('Months let per year')}</label>
                  <input id={`${uid}-months`} className="input" type="number" inputMode="numeric" min={0} max={12} step={1}
                    value={v.monthsLet} onChange={(e) => set({ monthsLet: Math.min(12, Math.round(n(e.target.value))) })} />
                </div>
              </>
            )}
            {pctField('management', 'Property management', 'Often 20–30% of revenue')}
            {usdField('hoa', 'HOA per month')}
            {usdField('upkeep', 'Utilities and maintenance per month')}
            {pctField('insurance', 'Insurance, % of price per year', undefined, 0.1)}
            {pctField('propertyTax', 'Property tax, % per year', 'Up to 0.25% of the cadastral value', 0.05)}
            {pctField('incomeTax', 'Income tax on rental profit', 'Ask a Honduran accountant: it depends on residency')}
          </div>
        </div>

        <div className="calc__card">
          <dl className="calc__rows">
            <div>
              <dt>{t('Rental revenue per year')}
                <small>{v.mode === 'nightly'
                  ? t('{nights} nights × {rate}', { nights: r.nights, rate: money.amount(v.nightly) })
                  : t('{months} months × {rent}', { months: v.monthsLet, rent: money.amount(v.monthlyRent) })}</small>
              </dt>
              <dd><b>{money.amount(Math.round(r.gross))}</b></dd>
            </div>
            {r.costs.map((c) => (
              <div key={c.key}><dt>{t(c.label)}</dt><dd>−{money.bare(Math.round(c.amount))}</dd></div>
            ))}
            {r.tax > 0 && <div><dt>{t('Income tax')}</dt><dd>−{money.bare(Math.round(r.tax))}</dd></div>}
            <div className="calc__total">
              <dt>{t('Net income per year')}<small>{t('{amount} a month', { amount: money.amount(Math.round(r.net / 12)) })}</small></dt>
              <dd><b>{money.amount(Math.round(r.net))}</b></dd>
            </div>
            <div className="calc__total calc__total--big">
              <dt>{t('Net yield')}<small>{t('Gross yield {p}', { p: pct(r.grossYield) })}</small></dt>
              <dd><b className={r.netYield < 0 ? 'yield__neg' : undefined}>{pct(r.netYield)}</b></dd>
            </div>
            <div>
              <dt>{t('Payback')}<small>{t('Price divided by net income, before financing and closing costs')}</small></dt>
              <dd>{Number.isFinite(r.payback) ? t('{n} years', { n: Math.round(r.payback * 10) / 10 }) : '—'}</dd>
            </div>
          </dl>
          <p className="tiny muted calc__note">
            {t('An example to check your own numbers, not a forecast. Average Roatán figures: {occ}% occupancy at about ${rate} a night; local agents quote 5–8% net yields for well-run units.', {
              occ: AIRDNA.occupancy, rate: AIRDNA.nightly,
            })}{' '}
            {t('Check that the building allows short-term rentals.')}{' '}
            <Link className="link-accent" href={RENTAL_GUIDE}>{t('Roatán rental income guide')} <Icon name="arrowRight" size={14} /></Link>
          </p>
        </div>
      </div>
    </section>
  );
}
