'use client';
import { useState } from 'react';
import { useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
import type { DevFinance } from '@/lib/types';

/** Платіж по розстрочці: ануїтет, якщо ставка є; інакше рівні частини */
export function installment(principal: number, months: number, ratePct: number) {
  if (months <= 0) return 0;
  if (!ratePct) return principal / months;
  const r = ratePct / 100 / 12;
  return (principal * r) / (1 - (1 + r) ** -months);
}

/**
 * Калькулятор на сторінці ЖК: ціна квартири (з прайсу або своя), внесок і строк від забудовника.
 * Покупець одразу бачить «внесок $X, далі $Y на місяць» замість «запитайте відділ продажів».
 */
export default function DevPaymentCalc({ finance, prices }: { finance: DevFinance; prices: number[] }) {
  const t = useT();
  const money = useMoney();
  const sorted = [...new Set(prices.filter((p) => p > 0))].sort((a, b) => a - b);
  const [price, setPrice] = useState(sorted[0] ?? 150_000);
  const [down, setDown] = useState(finance.downPct ?? 30);
  const [months, setMonths] = useState(finance.months ?? 24);
  const rate = finance.rate ?? 0;

  const downAmt = Math.round((price * down) / 100);
  const rest = price - downAmt;
  const monthly = finance.months ? installment(rest, months, rate) : 0;
  const min = sorted[0] ?? 50_000;
  const max = sorted[sorted.length - 1] ?? 500_000;

  return (
    <div className="pcalc">
      <div className="pcalc__in">
        <label className="field"><span className="small muted">{t('Unit price')}</span>
          {sorted.length > 1 && sorted.length <= 40 ? (
            <select className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))}>
              {sorted.map((p) => <option key={p} value={p}>{money.amount(p)}</option>)}
            </select>
          ) : (
            <input className="input" type="number" min={1} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
          )}
          {sorted.length > 40 && (
            <input type="range" min={min} max={max} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label={t('Unit price')} />
          )}
        </label>
        <label className="field"><span className="small muted">{t('Down payment, %')}</span>
          <input className="input" type="number" min={finance.downPct ?? 0} max={100} step={5} value={down}
            onChange={(e) => setDown(Math.min(100, Math.max(finance.downPct ?? 0, Number(e.target.value))))} />
        </label>
        {finance.months ? (
          <label className="field"><span className="small muted">{t('Installments, months')}</span>
            <input className="input" type="number" min={1} max={finance.months} value={months}
              onChange={(e) => setMonths(Math.min(finance.months!, Math.max(1, Number(e.target.value))))} />
          </label>
        ) : null}
      </div>
      <div className="pcalc__out">
        <div><span className="small muted">{t('Down payment')}</span><b>{money.amount(downAmt)}</b></div>
        {finance.months ? (
          <div><span className="small muted">{t('Then per month')}</span><b>{money.amount(Math.round(monthly))}</b>
            <span className="tiny muted">{rate ? t('{n}% a year, {m} months', { n: rate, m: months }) : t('interest-free, {m} months', { m: months })}</span></div>
        ) : (
          <div><span className="small muted">{t('Balance on delivery or through a bank')}</span><b>{money.amount(rest)}</b></div>
        )}
      </div>
      {finance.banks.length > 0 && (
        <p className="small" style={{ margin: '10px 0 0' }}>
          <span className="muted">{t('Mortgage through partner banks:')}</span> {finance.banks.join(', ')}
        </p>
      )}
    </div>
  );
}
