'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import { fmtMoney, isPromoProduct, PROMO_KINDS, type PromoKind } from '@/lib/promoShared';
import { STATUS_LABEL, type Plan, type PlanCredit, type SubjectKind, type Subscription } from '@/lib/billingShared';

type Data = {
  plans: Plan[]; subscriptions: Subscription[]; enforce: boolean; graceDays: number;
  targets: { kind: SubjectKind; id: string; name: string }[]; payments: string;
};

/** Бонуси тарифу одним рядком: «featured:listing:7x1, bump:listing:1x4». */
const creditsToText = (c: PlanCredit[]) => c.map((x) => `${x.product}:${x.kind}:${x.days}x${x.count}`).join(', ');
function textToCredits(s: string): PlanCredit[] | null {
  const out: PlanCredit[] = [];
  for (const part of s.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^([a-z_]+):([a-z]+):(\d+)x(\d+)$/);
    if (!m || !isPromoProduct(m[1]) || !PROMO_KINDS.includes(m[2] as PromoKind)) return null;
    out.push({ product: m[1], kind: m[2] as PromoKind, days: Number(m[3]), count: Number(m[4]) });
  }
  return out;
}

const dollars = (cents: number) => String(cents / 100);
const toCents = (v: string) => Math.round(Number(v || 0) * 100);
const limText = (n: number | null) => (n == null ? '' : String(n));
const limVal = (v: string) => (v.trim() === '' ? null : Number(v));

/** Один тариф у таблиці: правки зберігаються кнопкою Save. */
function PlanRow({ p, onSaved }: { p: Plan; onSaved: () => void }) {
  const [f, setF] = useState({
    name: p.name, blurb: p.blurb, month: dollars(p.priceMonthCents), year: dollars(p.priceYearCents),
    listings: limText(p.maxListings), devs: limText(p.maxDevelopments), seats: limText(p.maxSeats),
    credits: creditsToText(p.credits), trial: String(p.trialDays), active: p.active,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save() {
    const credits = textToCredits(f.credits);
    if (!credits) return toast('Promotions: product:kind:daysxcount, comma-separated (e.g. featured:listing:7x1)');
    setBusy(true);
    const plan: Plan = {
      ...p, name: f.name, blurb: f.blurb, priceMonthCents: toCents(f.month), priceYearCents: toCents(f.year),
      maxListings: limVal(f.listings), maxDevelopments: limVal(f.devs), maxSeats: limVal(f.seats),
      credits, trialDays: Number(f.trial) || 0, active: f.active,
    };
    const res = await fetch('/api/admin/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'plan', plan }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? 'Could not save');
    toast(`${f.name} saved`);
    onSaved();
  }

  const free = p.audience === 'free';
  return (
    <tr>
      <td data-label="Plan">
        <input value={f.name} onChange={set('name')} aria-label="Name" />
        <div className="tiny muted">{p.id} · {p.audience}</div>
        <input value={f.blurb} onChange={set('blurb')} aria-label="Short description" placeholder="Short description" style={{ marginTop: 4 }} />
      </td>
      <td data-label="$ / month">{free ? '—' : <input type="number" min={0} step="1" value={f.month} onChange={set('month')} aria-label="Monthly price, $" />}</td>
      <td data-label="$ / year">{free ? '—' : <input type="number" min={0} step="1" value={f.year} onChange={set('year')} aria-label="Yearly price, $" />}</td>
      <td data-label="Listings"><input type="number" min={0} value={f.listings} onChange={set('listings')} placeholder="∞" aria-label="Listings limit" /></td>
      <td data-label="Projects"><input type="number" min={0} value={f.devs} onChange={set('devs')} placeholder="∞" aria-label="Projects limit" /></td>
      <td data-label="Team"><input type="number" min={1} value={f.seats} onChange={set('seats')} placeholder="∞" aria-label="Team limit" /></td>
      <td data-label="Included / month">
        {free ? '—' : <input value={f.credits} onChange={set('credits')} aria-label="Included promotions" placeholder="featured:listing:7x1" style={{ minWidth: 220 }} />}
      </td>
      <td data-label="Trial">{free ? '—' : <input type="number" min={0} max={90} value={f.trial} onChange={set('trial')} aria-label="Trial days" />}</td>
      <td data-label="On">{!free && <input type="checkbox" checked={f.active} onChange={set('active')} aria-label="Plan is on sale" />}</td>
      <td><button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={save}>Save</button></td>
    </tr>
  );
}

/**
 * Вкладка Billing в адмінці (міграція 0072): ціни й ліміти тарифів, увімкнення лімітів,
 * ручний тариф (подарунок чи оплата переказом), усі підписки.
 */
export default function BillingAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [grant, setGrant] = useState({ target: '', planId: '', until: '', note: '' });
  const [rev, setRev] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/billing');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.unavailable ? 'Run migration 0072 to turn on plans.' : d.error ?? 'Could not load'); return; }
    setData(d); setRev((r) => r + 1);
  }, []);
  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>, ok: string) => {
    const res = await fetch('/api/admin/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast(d.error ?? 'Something went wrong'); return false; }
    toast(ok); load(); return true;
  };

  if (error) return <div className="panel"><p className="muted">{error}</p></div>;
  if (!data) return <div className="panel"><p className="muted">Loading…</p></div>;

  const paidPlans = data.plans.filter((p) => p.audience !== 'free');
  const planName = new Map(data.plans.map((p) => [p.id, p.name]));
  const live = data.subscriptions.filter((s) => ['active', 'trialing', 'past_due'].includes(s.status));
  const mrr = live.filter((s) => !s.manual && s.status !== 'trialing')
    .reduce((m, s) => m + (s.interval === 'year' ? Math.round(s.priceCents / 12) : s.priceCents), 0);

  return (
    <>
      <div className="stats">
        <div className="stat"><span className="muted small">Paying</span><b>{live.filter((s) => !s.manual && s.status !== 'trialing').length}</b></div>
        <div className="stat"><span className="muted small">On trial</span><b>{live.filter((s) => s.status === 'trialing').length}</b></div>
        <div className="stat"><span className="muted small">Granted</span><b>{live.filter((s) => s.manual).length}</b></div>
        <div className="stat"><span className="muted small">Monthly revenue</span><b>{fmtMoney(mrr)}</b></div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Limits</h3>
        <p className="small muted" style={{ margin: '6px 0 12px' }}>
          {data.enforce
            ? 'On: new listings, projects and team members over the plan limit are blocked. Published items always stay online. Admins are never limited.'
            : 'Off: plans are on sale and limits are shown in the cabinet, but nothing is blocked yet.'}
          {' '}Payments: {data.payments === 'manual' ? 'Stripe is not connected' : data.payments === 'stripe-test' ? 'Stripe test mode' : 'Stripe live'}.
        </p>
        <button type="button" className={`btn ${data.enforce ? 'btn--ghost' : 'btn--primary'}`}
          onClick={() => confirm(data.enforce ? 'Stop enforcing plan limits?' : 'Start enforcing plan limits for everyone?')
            && post({ action: 'enforce', on: !data.enforce }, data.enforce ? 'Limits off' : 'Limits on')}>
          {data.enforce ? 'Turn limits off' : 'Turn limits on'}
        </button>
      </div>

      <div className="panel plan-admin" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 6 }}>Plans</h3>
        <p className="tiny muted" style={{ marginBottom: 12 }}>
          Empty limit = unlimited. A new price applies to new subscriptions and plan switches; current subscribers keep theirs.
          Included promotions: product:kind:days x count, e.g. featured:listing:7x1, bump:listing:1x4, featured:development:30x1.
        </p>
        <div className="promo__table">
          <table className="table">
            <thead><tr><th>Plan</th><th>$ / month</th><th>$ / year</th><th>Listings</th><th>Projects</th><th>Team</th><th>Included / month</th><th>Trial days</th><th>On sale</th><th /></tr></thead>
            <tbody>{data.plans.map((p) => <PlanRow key={`${p.id}-${rev}`} p={p} onSaved={load} />)}</tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 6 }}>Grant a plan</h3>
        <p className="tiny muted" style={{ marginBottom: 12 }}>For partners or bank transfers: the plan works until the date, no card needed.</p>
        <div className="chip-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select value={grant.target} onChange={(e) => setGrant({ ...grant, target: e.target.value })} aria-label="Account">
            <option value="">Agency or independent agent…</option>
            {data.targets.map((x) => <option key={`${x.kind}:${x.id}`} value={`${x.kind}:${x.id}`}>{x.name} · {x.kind === 'agency' ? 'agency' : 'agent'}</option>)}
          </select>
          <select value={grant.planId} onChange={(e) => setGrant({ ...grant, planId: e.target.value })} aria-label="Plan">
            <option value="">Plan…</option>
            {paidPlans.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.audience})</option>)}
          </select>
          <input type="date" value={grant.until} onChange={(e) => setGrant({ ...grant, until: e.target.value })} aria-label="Until" />
          <input value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} placeholder="Note (why)" aria-label="Note" />
          <button type="button" className="btn btn--primary" disabled={!grant.target || !grant.planId || !grant.until}
            onClick={async () => {
              const [kind, id] = grant.target.split(':');
              if (await post({ action: 'grant', kind, id, planId: grant.planId, until: `${grant.until}T23:59:59Z`, note: grant.note }, 'Plan granted')) {
                setGrant({ target: '', planId: '', until: '', note: '' });
              }
            }}>Grant</button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Subscriptions</h3>
        {data.subscriptions.length === 0 ? <p className="muted small">No subscriptions yet.</p> : (
          <div className="promo__table">
            <table className="table">
              <thead><tr><th>Account</th><th>Plan</th><th>Status</th><th>Price</th><th>Period ends</th><th>Since</th><th /></tr></thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Account">{s.subjectName || '—'}<div className="tiny muted">{s.subjectKind}</div></td>
                    <td data-label="Plan">{planName.get(s.planId) ?? s.planId}{s.note && <div className="tiny muted">{s.note}</div>}</td>
                    <td data-label="Status">
                      <span className={`pill ${['active', 'trialing'].includes(s.status) ? 'pill--on' : 'pill--off'}`}>{s.manual ? 'Granted' : STATUS_LABEL[s.status]}</span>
                      {s.cancelAtPeriodEnd && <div className="tiny muted">cancels at period end</div>}
                    </td>
                    <td data-label="Price">{s.manual ? '—' : `${fmtMoney(s.priceCents, s.currency)} / ${s.interval}`}</td>
                    <td className="small" data-label="Period ends">{s.periodEnd ? fmtDate(s.periodEnd) : '—'}</td>
                    <td className="small" data-label="Since">{fmtDate(s.createdAt)}</td>
                    <td>
                      {s.manual && s.status === 'active' && (
                        <button type="button" className="btn btn--sm btn--ghost"
                          onClick={() => confirm(`Remove the granted plan from ${s.subjectName}?`) && post({ action: 'revoke', id: s.id }, 'Plan removed')}>
                          Remove
                        </button>
                      )}
                      {!s.manual && s.stripeSubscription && (
                        <a className="btn btn--sm btn--ghost" target="_blank" rel="noopener"
                          href={`https://dashboard.stripe.com/${data.payments === 'stripe-test' ? 'test/' : ''}subscriptions/${s.stripeSubscription}`}>Stripe</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
