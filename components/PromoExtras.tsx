'use client';
import Icon from './Icon';
import { fmtDate, fmtNumber } from '@/lib/format';
import { PROMO_PRODUCTS, campaignTitle, fmtMoney, liftLabel, type PromoCampaign, type PromoEffect } from '@/lib/promoShared';

/**
 * «До/під час»: перегляди сторінки й заявки за кампанію проти такого самого
 * числа днів перед стартом (promo_effect, міграція 0060).
 */
export function EffectCell({ e }: { e?: PromoEffect }) {
  if (!e) return <span className="muted">—</span>;
  const tone = (b: number, d: number) => (d > b ? 'is-up' : d < b ? 'is-down' : '');
  return (
    <div className="promo-effect" title={`Same ${e.windowDays} days before the campaign vs during it`}>
      <span className={tone(e.viewsBefore, e.viewsDuring)}>
        <Icon name="eye" size={14} /> {fmtNumber(e.viewsBefore)} → {fmtNumber(e.viewsDuring)}
        <em>{liftLabel(e.viewsBefore, e.viewsDuring)}</em>
      </span>
      <span className={tone(e.leadsBefore, e.leadsDuring)}>
        <Icon name="inbox" size={14} /> {fmtNumber(e.leadsBefore)} → {fmtNumber(e.leadsDuring)}
        <em>{liftLabel(e.leadsBefore, e.leadsDuring)}</em>
      </span>
    </div>
  );
}

/** Історія оплат: усе оплачене, з поверненнями і чеками (PDF; для Stripe — ще й чек Stripe). */
export function PaymentHistory({ campaigns }: { campaigns: PromoCampaign[] }) {
  const paid = campaigns.filter((c) => c.paidAt)
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  if (!paid.length) return null;
  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 12 }}>Payment history</h3>
      <div className="promo__table">
        <table className="table">
          <thead><tr><th>Date</th><th>Service</th><th>Amount</th><th>Method</th><th>Receipt</th></tr></thead>
          <tbody>
            {paid.map((c) => (
              <tr key={c.id}>
                <td className="small" data-label="Date">{fmtDate(c.paidAt!)}</td>
                <td data-label="Service">
                  <div className="tiny muted">{campaignTitle(c)}</div>
                  {c.targetName || '—'}
                </td>
                <td data-label="Amount">
                  {fmtMoney(c.priceCents, c.currency)}
                  {c.refundedAt && (
                    <div className="tiny promo-refunded">
                      Refunded {fmtMoney(c.refundCents || c.priceCents, c.currency)} · {fmtDate(c.refundedAt)}
                    </div>
                  )}
                </td>
                <td className="small" data-label="Method">{c.payMethod === 'stripe' ? 'Card (Stripe)' : 'Manual'}</td>
                <td data-label="Receipt" style={{ whiteSpace: 'nowrap' }}>
                  <a className="btn btn--sm btn--ghost" href={`/api/promo/${c.id}/receipt`} target="_blank" rel="noopener">
                    <Icon name="download" size={14} /> PDF
                  </a>
                  {c.payMethod === 'stripe' && (
                    <a className="btn btn--sm btn--ghost" href={`/api/promo/${c.id}/receipt?stripe=1`} target="_blank" rel="noopener">
                      Stripe
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        {PROMO_PRODUCTS.bump.label} is a one-time service; other promotions run for the days you paid for.
        Refunds stop the promotion straight away.
      </p>
    </div>
  );
}

/**
 * Покази або переходи по днях — один ряд стовпчиків, без другої осі.
 * Дні без даних — нульові стовпчики, щоб видно було паузи. Наведення показує день і число,
 * а таблиця під «Show numbers» — те саме для екранних читалок.
 */
export function DailyBars({ title, days, values, unit }: {
  title: string; days: string[]; values: number[]; unit: string;
}) {
  const max = Math.max(1, ...values);
  const total = values.reduce((s, v) => s + v, 0);
  const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <figure className="pchart">
      <figcaption className="pchart__head">
        <span className="small muted">{title}</span>
        <b>{fmtNumber(total)}</b>
      </figcaption>
      <div className="pchart__bars" role="img" aria-label={`${title}: ${fmtNumber(total)} over ${days.length} days`}>
        {days.map((d, i) => (
          <span key={d} className="pchart__col" tabIndex={0} data-tip={`${label(d)} · ${fmtNumber(values[i])} ${unit}`}>
            <i style={{ height: values[i] ? `${Math.max(4, (values[i] / max) * 100)}%` : 0 }} />
          </span>
        ))}
      </div>
      <div className="pchart__axis tiny muted">
        <span>{days.length ? label(days[0]) : ''}</span>
        <span>{days.length > 1 ? label(days[days.length - 1]) : ''}</span>
      </div>
      <details className="pchart__table tiny">
        <summary className="muted">Show numbers</summary>
        <table className="table">
          <tbody>
            {days.map((d, i) => <tr key={d}><td>{label(d)}</td><td>{fmtNumber(values[i])}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
