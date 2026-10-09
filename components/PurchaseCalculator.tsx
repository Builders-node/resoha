'use client';
import Link from 'next/link';
import { useId, useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
import {
  CASH_TERMS, CLOSING_GUIDE, COST_ITEMS, DEFAULT_TERMS, OWNER_TERMS, PROPERTY_TAX_RATE, TYPICAL_CLOSING,
  monthlyPayment, type Terms,
} from '@/lib/purchaseCosts';

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
/** Порожнє чи криве поле — нуль, і в межах [min, max] */
const num = (s: string, min: number, max: number) => {
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : 0;
};
const asText = (t: Terms) => ({ down: String(t.down), rate: String(t.rate), years: String(t.years) });

/**
 * Скільки треба грошей, щоб купити, і скільки виходить на місяць у розстрочку.
 * Витрати на угоду — за гайдом roatan-closing-costs, фінансування — звичайний ануїтет.
 */
export default function PurchaseCalculator({ price, hoa, ownerFinancing, showCosts = true, showFinancing = true }: {
  price: number; hoa: number; ownerFinancing: boolean; showCosts?: boolean; showFinancing?: boolean;
}) {
  const t = useT();
  const money = useMoney();
  const id = useId();
  const [legal, setLegal] = useState(String(COST_ITEMS[1].rate * 100));
  const [terms, setTerms] = useState(asText(ownerFinancing ? OWNER_TERMS : DEFAULT_TERMS));
  const [preset, setPreset] = useState<'owner' | 'custom' | 'cash'>(ownerFinancing ? 'owner' : 'custom');

  const rates = COST_ITEMS.map((c) => (c.key === 'legal' ? num(legal, c.min * 100, c.max * 100) / 100 : c.rate));
  const costs = rates.map((r) => price * r);
  const closing = costs.reduce((s, x) => s + x, 0);

  const down = num(terms.down, 0, 100);
  const rate = num(terms.rate, 0, 30);
  const years = num(terms.years, 0, 40);
  const loan = price * (1 - down / 100);
  const financed = loan > 0 && years > 0;
  const pay = financed ? monthlyPayment(loan, rate, years) : 0;
  const monthly = pay + (hoa > 0 ? hoa : 0);
  const totalPaid = pay * Math.round(years * 12);

  const pick = (p: 'owner' | 'custom' | 'cash') => {
    setPreset(p);
    setTerms(asText(p === 'owner' ? OWNER_TERMS : p === 'cash' ? CASH_TERMS : DEFAULT_TERMS));
  };
  const edit = (k: keyof Terms, v: string) => { setPreset('custom'); setTerms((s) => ({ ...s, [k]: v })); };

  return (
    <section className="calc" id="costs">
      <h3 className="prop__h">
        {t(showCosts && showFinancing ? 'Cost to buy and financing' : showCosts ? 'Purchase costs' : 'Financing')}
      </h3>
      <div className={`calc__grid ${showCosts && showFinancing ? '' : 'calc__grid--one'}`}>
        {showCosts && <div className="calc__card">
          {showFinancing && <h4>{t('Purchase costs')}</h4>}
          <dl className="calc__rows">
            <div><dt>{t('Price')}</dt><dd>{money.amount(price)}</dd></div>
            {COST_ITEMS.map((c, i) => (
              <div key={c.key}>
                <dt>
                  {t(c.label)}
                  <small>{t(c.hint)}</small>
                </dt>
                <dd>
                  {c.key === 'legal' ? (
                    <span className="calc__inline">
                      <input id={`${id}-legal`} className="input calc__pct" type="number" inputMode="decimal"
                        min={c.min * 100} max={c.max * 100} step={0.5} value={legal}
                        aria-label={t('Attorney and notary fees, % of the price')}
                        onChange={(e) => setLegal(e.target.value)} />
                      <span className="muted small">%</span>
                    </span>
                  ) : <span className="muted small">{pct(rates[i])}</span>}
                  <b>{money.amount(Math.round(costs[i]))}</b>
                </dd>
              </div>
            ))}
            <div className="calc__total">
              <dt>{t('Closing costs')}<small>{t('{p} of the price', { p: pct(closing / price) })}</small></dt>
              <dd><b>{money.amount(Math.round(closing))}</b></dd>
            </div>
            <div className="calc__total calc__total--big">
              <dt>{t('Cash needed at closing')}<small>{t('Down payment plus closing costs')}</small></dt>
              <dd><b>{money.amount(Math.round(price * (down / 100) + closing))}</b></dd>
            </div>
          </dl>
          <p className="tiny muted calc__note">
            {t('Most straightforward deals land at {low}–{high} of the price ({from}–{to}); buying through a Honduran company or several parcels can reach 7%. The seller usually pays the agent.', {
              low: pct(TYPICAL_CLOSING.low), high: pct(TYPICAL_CLOSING.high),
              from: money.amount(Math.round(price * TYPICAL_CLOSING.low)), to: money.amount(Math.round(price * TYPICAL_CLOSING.high)),
            })}{' '}
            {t('Property tax: up to {price}/yr (0.25% of the cadastral value).', { price: money.amount(Math.round(price * PROPERTY_TAX_RATE)) })}{' '}
            <Link className="link-accent" href={CLOSING_GUIDE}>{t('Roatán closing costs guide')} <Icon name="arrowRight" size={14} /></Link>
          </p>
        </div>}

        {showFinancing && <div className="calc__card">
          {showCosts && <h4>{t('Financing')}</h4>}
          <div className="chip-row calc__presets" role="group" aria-label={t('Payment options')}>
            {ownerFinancing && (
              <button type="button" className={`chip-btn ${preset === 'owner' ? 'is-on' : ''}`} onClick={() => pick('owner')}>
                {t('Owner financing')}
              </button>
            )}
            <button type="button" className={`chip-btn ${preset === 'custom' ? 'is-on' : ''}`} onClick={() => pick('custom')}>{t('Loan')}</button>
            <button type="button" className={`chip-btn ${preset === 'cash' ? 'is-on' : ''}`} onClick={() => pick('cash')}>{t('Pay cash')}</button>
          </div>
          {preset === 'owner' && (
            <p className="small calc__hint">
              {t('The seller offers financing. These are example terms: ask the agent for the real down payment, rate and term.')}
            </p>
          )}

          <div className="calc__inputs">
            <div className="field">
              <label htmlFor={`${id}-down`}>{t('Down payment')}</label>
              <span className="calc__inline">
                <input id={`${id}-down`} className="input" type="number" inputMode="decimal" min={0} max={100} step={5}
                  value={terms.down} onChange={(e) => edit('down', e.target.value)} />
                <span className="muted small">%</span>
              </span>
              <span className="tiny muted">{money.amount(Math.round(price * (down / 100)))}</span>
            </div>
            <div className="field">
              <label htmlFor={`${id}-rate`}>{t('Interest rate')}</label>
              <span className="calc__inline">
                <input id={`${id}-rate`} className="input" type="number" inputMode="decimal" min={0} max={30} step={0.25}
                  value={terms.rate} onChange={(e) => edit('rate', e.target.value)} disabled={down >= 100} />
                <span className="muted small">{t('% / yr')}</span>
              </span>
            </div>
            <div className="field">
              <label htmlFor={`${id}-years`}>{t('Term')}</label>
              <span className="calc__inline">
                <input id={`${id}-years`} className="input" type="number" inputMode="numeric" min={1} max={40} step={1}
                  value={terms.years} onChange={(e) => edit('years', e.target.value)} disabled={down >= 100} />
                <span className="muted small">{t('years')}</span>
              </span>
            </div>
          </div>

          {financed ? (
            <dl className="calc__rows">
              <div><dt>{t('Loan amount')}</dt><dd><b>{money.amount(Math.round(loan))}</b></dd></div>
              <div><dt>{t('Monthly payment')}</dt><dd><b>{money.amount(Math.round(pay))}</b></dd></div>
              {hoa > 0 && <div><dt>{t('HOA')}</dt><dd><b>{money.amount(hoa)}</b></dd></div>}
              <div className="calc__total calc__total--big">
                <dt>{t('Per month')}{hoa > 0 && <small>{t('Payment plus HOA')}</small>}</dt>
                <dd><b>{money.amount(Math.round(monthly))}</b></dd>
              </div>
              <div><dt>{t('Total of payments')}<small>{t('over {n} years', { n: years })}</small></dt><dd>{money.amount(Math.round(totalPaid))}</dd></div>
              <div><dt>{t('Total interest')}</dt><dd>{money.amount(Math.round(Math.max(0, totalPaid - loan)))}</dd></div>
            </dl>
          ) : (
            <dl className="calc__rows">
              <div className="calc__total calc__total--big">
                <dt>{t('Per month')}<small>{hoa > 0 ? t('HOA only — no loan') : t('No loan')}</small></dt>
                <dd><b>{money.amount(Math.round(hoa > 0 ? hoa : 0))}</b></dd>
              </div>
            </dl>
          )}
          <p className="tiny muted calc__note">
            {t('An estimate, not an offer. Mortgages for foreign buyers are rare on Roatán; most pay cash or agree terms with the seller.')}
          </p>
        </div>}
      </div>
    </section>
  );
}
