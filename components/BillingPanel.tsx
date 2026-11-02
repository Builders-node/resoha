'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { fmtDate } from '@/lib/format';
import { fmtMoney, KIND_LABEL, PROMO_PRODUCTS, type PromoTarget } from '@/lib/promoShared';
import {
  STATUS_LABEL, limitLabel, perMonth, yearSavingPct,
  type BillingInterval, type BillingOverview, type Invoice, type Plan, type PlanAudience, type PlanCredit,
} from '@/lib/billingShared';

type Data = BillingOverview & { plans: Plan[]; invoices: Invoice[]; payments: 'stripe' | 'stripe-test' | 'manual' };

/** Шкала «зайнято з ліміту». */
function Meter({ label, used, max }: { label: string; used: number; max: number | null }) {
  const t = useT();
  const pct = max == null ? 0 : Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const full = max != null && used >= max;
  return (
    <div className="plan-meter">
      <div className="plan-meter__top">
        <span className="small">{t(label)}</span>
        <b className={full ? 'plan-meter__full' : ''}>{used} / {max == null ? t('Unlimited') : max}</b>
      </div>
      {max != null && <div className="plan-meter__bar"><span style={{ width: `${pct}%` }} className={full ? 'is-full' : ''} /></div>}
    </div>
  );
}

function creditText(c: PlanCredit, t: ReturnType<typeof useT>) {
  const p = PROMO_PRODUCTS[c.product];
  const what = `${t(p.label)} · ${t(KIND_LABEL[c.kind]).toLowerCase()}`;
  return p.once ? `${c.count} × ${what}` : `${c.count} × ${what}, ${t('{n} days', { n: c.days })}`;
}

/** Що дає тариф — для картки. */
function PlanFeatures({ p }: { p: Plan }) {
  const t = useT();
  return (
    <ul className="plan-card__list">
      <li><Icon name="home" size={15} /> {t('Published listings')}: <b>{t(limitLabel(p.maxListings))}</b></li>
      <li><Icon name="building" size={15} /> {t('Projects')}: <b>{t(limitLabel(p.maxDevelopments))}</b></li>
      <li><Icon name="users" size={15} /> {t('Team members')}: <b>{t(limitLabel(p.maxSeats))}</b></li>
      {p.credits.map((c, i) => (
        <li key={i}><Icon name="sparkle" size={15} /> {creditText(c, t)} {t('every month')}</li>
      ))}
    </ul>
  );
}

/**
 * Вкладка Plan у кабінеті: тариф акаунта (агенції чи незалежного ріелтора), що з нього
 * зайнято, бонусні просування, вибір тарифу через Stripe і рахунки (міграція 0072).
 */
export default function BillingPanel({ developer }: { developer?: boolean }) {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [interval, setPeriod] = useState<BillingInterval>('month');
  const [audience, setAudience] = useState<Exclude<PlanAudience, 'free'>>(developer ? 'developer' : 'agency');
  const [busy, setBusy] = useState('');
  const [targets, setTargets] = useState<PromoTarget[] | null>(null);
  const [creditOpen, setCreditOpen] = useState<number | null>(null);
  const [creditTarget, setCreditTarget] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/billing');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.unavailable ? t('Plans are being set up — check back soon.') : d.error ?? t('Could not load')); return; }
    setData(d);
    if (d.subscription?.interval === 'year') setPeriod('year');
    const cur = (d.plans as Plan[]).find((p) => p.id === d.plan?.id);
    if (cur && cur.audience !== 'free') setAudience(cur.audience);
  }, [t]);
  useEffect(() => { load(); }, [load]);

  // повернення зі Stripe
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get('subscribed');
    if (!s && !sp.get('canceled')) return;
    if (s === '1') toast(t('Your plan is active. Thank you!'));
    else if (s === 'pending') toast(t('Payment is processing — your plan will switch in a minute.'));
    sp.delete('subscribed'); sp.delete('canceled');
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
  }, [t]);

  const post = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    try {
      const res = await fetch('/api/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast(d.error ?? t('Something went wrong')); return null; }
      const url = d.checkoutUrl ?? d.url;
      if (url) { window.location.href = url; return d; }
      await load();
      return d;
    } finally {
      setBusy('');
    }
  };

  const openCredit = async (i: number) => {
    setCreditOpen(creditOpen === i ? null : i);
    setCreditTarget('');
    if (targets) return;
    const d = await fetch('/api/promo').then((r) => r.json()).catch(() => ({}));
    setTargets(d.targets ?? []);
  };

  const plans = useMemo(() => (data?.plans ?? []).filter((p) => p.audience === audience), [data, audience]);
  const saving = useMemo(() => Math.max(0, ...plans.map(yearSavingPct)), [plans]);

  if (error) return <div className="panel"><p className="muted">{error}</p></div>;
  if (!data) return <div className="panel"><p className="muted">{t('Loading…')}</p></div>;

  const { plan, subscription: sub, usage, credits, canManage } = data;
  const paidSub = sub && !sub.manual ? sub : null;
  const isFree = plan.audience === 'free';

  return (
    <>
      <div className="panel plan-now">
        <div className="plan-now__head">
          <div>
            <span className="tiny muted">{t(data.subject.kind === 'agency' ? 'Plan for {name}' : 'Your plan', { name: data.subject.name })}</span>
            <h3 className="with-ico" style={{ marginTop: 2 }}>
              <Icon name="wallet" size={20} /> {plan.name}
              {sub && <span className={`pill ${sub.status === 'past_due' ? 'pill--off' : 'pill--on'}`}>{t(STATUS_LABEL[sub.status])}</span>}
            </h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              {sub?.manual && sub.periodEnd && t('Granted by Hogarli until {date}', { date: fmtDate(sub.periodEnd) })}
              {paidSub && `${fmtMoney(paidSub.priceCents, paidSub.currency)} / ${t(paidSub.interval === 'year' ? 'year' : 'month')}`}
              {paidSub?.status === 'trialing' && paidSub.trialEnd && ` · ${t('free until {date}', { date: fmtDate(paidSub.trialEnd) })}`}
              {paidSub && paidSub.periodEnd && paidSub.status !== 'trialing' && ` · ${t(paidSub.cancelAtPeriodEnd ? 'ends {date}' : 'renews {date}', { date: fmtDate(paidSub.periodEnd) })}`}
              {isFree && t('Free forever. Upgrade for more listings, a bigger team and promotion every month.')}
            </p>
            {paidSub?.status === 'past_due' && (
              <p className="small plan-warn" style={{ marginTop: 8 }}>
                {t('The last payment did not go through. Update your card to keep the plan.')}
              </p>
            )}
          </div>
          {canManage && paidSub && (
            <div className="plan-now__btns">
              {data.hasCustomer && (
                <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => post('portal', { action: 'portal' })}>
                  <Icon name="wallet" size={16} /> {t('Card and invoices')}
                </button>
              )}
              {paidSub.cancelAtPeriodEnd ? (
                <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => post('resume', { action: 'resume' })}>
                  {t('Keep my plan')}
                </button>
              ) : (
                <button type="button" className="btn btn--ghost" disabled={!!busy}
                  onClick={() => confirm(t('Cancel at the end of the paid period? Your listings stay online; the limits switch to Free.')) && post('cancel', { action: 'cancel' })}>
                  {t('Cancel plan')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="plan-meters">
          <Meter label="Published listings" used={usage.listings} max={plan.maxListings} />
          <Meter label="Projects" used={usage.developments} max={plan.maxDevelopments} />
          {data.subject.kind === 'agency' && <Meter label="Team members" used={usage.seats} max={plan.maxSeats} />}
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {t('Units inside a project do not count as listings. Over the limit, what is already published stays online; new items wait until you upgrade or unpublish something.')}
        </p>

        {credits.length > 0 && (
          <div className="plan-credits">
            <b>{t('Included promotions this month')}</b>
            {credits.map((c, i) => {
              const left = Math.max(0, c.count - c.used);
              const options = (targets ?? []).filter((x) => x.kind === c.kind && x.active);
              return (
                <div key={i} className="plan-credit">
                  <div className="plan-credit__row">
                    <span className="with-ico"><Icon name={PROMO_PRODUCTS[c.product].icon} size={16} /> {creditText(c, t)}</span>
                    <span className="small muted">{t('{n} left', { n: left })}</span>
                    {canManage && left > 0 && (
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => openCredit(i)}>
                        {t(creditOpen === i ? 'Close' : 'Use')}
                      </button>
                    )}
                  </div>
                  {creditOpen === i && (
                    <div className="plan-credit__pick">
                      {targets == null ? <span className="small muted">{t('Loading…')}</span> : options.length === 0 ? (
                        <span className="small muted">{t('Nothing published to promote yet.')}</span>
                      ) : (
                        <>
                          <select value={creditTarget} onChange={(e) => setCreditTarget(e.target.value)} aria-label={t('What to promote')}>
                            <option value="">{t('Pick what to promote')}</option>
                            {options.map((o) => <option key={o.id} value={o.id}>{o.name}{o.sub ? ` · ${o.sub}` : ''}</option>)}
                          </select>
                          <button type="button" className="btn btn--sm btn--primary" disabled={!creditTarget || !!busy}
                            onClick={async () => {
                              const ok = await post('credit', { action: 'credit', kind: c.kind, targetId: creditTarget, product: c.product, days: c.days });
                              if (ok) { toast(t('Promotion started')); setCreditOpen(null); }
                            }}>
                            {t('Start promotion')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="plan-head">
          <h3>{t('Plans')}</h3>
          <div className="chip-row">
            <button type="button" className={`chip-btn ${audience === 'agency' ? 'is-on' : ''}`} onClick={() => setAudience('agency')}>{t('Agencies and agents')}</button>
            <button type="button" className={`chip-btn ${audience === 'developer' ? 'is-on' : ''}`} onClick={() => setAudience('developer')}>{t('Developers')}</button>
          </div>
          <div className="chip-row">
            <button type="button" className={`chip-btn ${interval === 'month' ? 'is-on' : ''}`} onClick={() => setPeriod('month')}>{t('Monthly')}</button>
            <button type="button" className={`chip-btn ${interval === 'year' ? 'is-on' : ''}`} onClick={() => setPeriod('year')}>
              {t('Yearly')}{saving > 0 && ` · −${saving}%`}
            </button>
          </div>
        </div>

        <div className="plan-cards">
          {[...data.plans.filter((p) => p.audience === 'free'), ...plans].map((p) => {
            const current = p.id === plan.id;
            const free = p.audience === 'free';
            const price = perMonth(p, interval);
            const trial = !data.hadTrial && p.trialDays > 0;
            return (
              <div key={p.id} className={`plan-card ${current ? 'is-current' : ''}`}>
                <b className="plan-card__name">{p.name}</b>
                <div className="plan-card__price">
                  {free ? '$0' : fmtMoney(price, p.currency)}<span className="small muted"> / {t('month')}</span>
                </div>
                <span className="tiny muted">
                  {!free && interval === 'year' ? t('{sum} billed yearly', { sum: fmtMoney(p.priceYearCents, p.currency) }) : ' '}
                </span>
                {p.blurb && <p className="small muted">{t(p.blurb)}</p>}
                <PlanFeatures p={p} />
                {current ? (
                  <span className="btn btn--ghost is-disabled" aria-disabled="true">{t('Current plan')}</span>
                ) : free ? (
                  <span className="tiny muted">{paidSub ? t("Cancel the paid plan to go back to Free") : null}</span>
                ) : !canManage ? (
                  <span className="tiny muted">{t('Ask the agency owner to change the plan')}</span>
                ) : data.payments === 'manual' ? (
                  <span className="tiny muted">{t('Card payments are coming soon. Write to us to switch now.')}</span>
                ) : (
                  <button type="button" className="btn btn--primary" disabled={!!busy}
                    onClick={() => {
                      if (paidSub && !confirm(t('Switch to {name}? The difference is charged or credited pro rata.', { name: p.name }))) return;
                      post(`plan:${p.id}`, { action: paidSub ? 'switch' : 'checkout', planId: p.id, interval });
                    }}>
                    {busy === `plan:${p.id}` ? t('One moment…') : paidSub ? t('Switch to {name}', { name: p.name })
                      : trial ? t('Start {n}-day free trial', { n: p.trialDays }) : t('Choose {name}', { name: p.name })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {data.payments === 'stripe-test' && (
          <p className="tiny muted" style={{ marginTop: 12 }}>{t('Test mode: pay with card 4242 4242 4242 4242, any future date and any CVC.')}</p>
        )}
        <p className="tiny muted" style={{ marginTop: 12 }}>
          {t('Secure card payment by Stripe. Cancel any time; the plan works until the end of the paid period. Prices in US dollars.')}
        </p>
      </div>

      {data.invoices.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>{t('Invoices')}</h3>
          <div className="promo__table">
            <table className="table">
              <thead><tr><th>{t('Date')}</th><th>{t('Invoice')}</th><th>{t('Amount')}</th><th>{t('Status')}</th><th /></tr></thead>
              <tbody>
                {data.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="small" data-label={t('Date')}>{fmtDate(i.date)}</td>
                    <td className="small" data-label={t('Invoice')}>{i.number || '—'}</td>
                    <td data-label={t('Amount')}>{fmtMoney(i.amountCents, i.currency)}</td>
                    <td className="small" data-label={t('Status')}>{t(i.status === 'paid' ? 'Paid' : i.status === 'open' ? 'Due' : i.status)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {i.pdf && <a className="btn btn--sm btn--ghost" href={i.pdf} target="_blank" rel="noopener"><Icon name="download" size={14} /> PDF</a>}
                      {i.url && <a className="btn btn--sm btn--ghost" href={i.url} target="_blank" rel="noopener">{t('Open')}</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
