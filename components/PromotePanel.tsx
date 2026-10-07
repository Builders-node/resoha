'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate, fmtNumber } from '@/lib/format';
import {
  KIND_LABEL, PROMO_KINDS, fmtMoney, isLive,
  type PromoCampaign, type PromoKind, type PromoPackage, type PromoTarget,
} from '@/lib/promoShared';

type Payments = 'stripe' | 'stripe-test' | 'manual';
type Data = { packages: PromoPackage[]; campaigns: PromoCampaign[]; targets: PromoTarget[]; payments: Payments };

const KIND_ICON: Record<PromoKind, string> = { listing: 'home', development: 'building', building: 'layers', agency: 'briefcase' };

export function targetHref(kind: PromoKind, id: string) {
  if (kind === 'listing') return `/listings/${id}`;
  if (kind === 'agency') return `/agency/${id}`;
  if (kind === 'development') return `/developments/${id}`;
  return null;
}

export function StatusPill({ c }: { c: PromoCampaign }) {
  if (c.status === 'pending') return <span className="badge badge--warn">Awaiting payment</span>;
  if (c.status === 'cancelled') return <span className="pill pill--off">Cancelled</span>;
  if (c.status === 'ended') return <span className="pill pill--off">Ended</span>;
  return isLive(c)
    ? <span className="pill pill--on">Live</span>
    : <span className="badge badge--ok">Starts {fmtDate(c.startsAt!)}</span>;
}

export const ctr = (c: { impressions: number; clicks: number }) =>
  c.impressions ? `${((c.clicks / c.impressions) * 100).toFixed(1)}%` : '—';

/**
 * Вкладка Promote у кабінеті: вибрати своє оголошення, ЖК, дім чи агенцію,
 * строк — і оплатити. Нижче — свої кампанії з показами й переходами.
 */
export default function PromotePanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<PromoKind>('listing');
  const [targetId, setTargetId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/promo');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.unavailable ? 'Promotions are being set up — check back soon.' : d.error ?? 'Could not load'); return; }
    setData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  // повернення зі Stripe і посилання «просунути це» з інших місць кабінету
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const paid = sp.get('paid');
    if (paid === '1') toast('Payment received — your promotion is live');
    else if (paid === 'pending') toast('Payment is being confirmed — the promotion turns on in a minute');
    else if (paid === '0' || sp.get('canceled')) toast('Payment was not completed');
    const k = sp.get('kind') as PromoKind | null;
    if (k && PROMO_KINDS.includes(k)) { setKind(k); setTargetId(sp.get('id') ?? ''); }
    if (paid || sp.get('canceled') || k) {
      ['paid', 'canceled', 'kind', 'id'].forEach((p) => sp.delete(p));
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    }
  }, []);

  const kinds = useMemo(() => PROMO_KINDS.filter((k) => data?.targets.some((t) => t.kind === k)), [data]);
  // вкладка відкрилась на типі, якого в людини немає, — перемикаємо на перший наявний
  useEffect(() => {
    if (data && kinds.length && !kinds.includes(kind)) setKind(kinds[0]);
  }, [data, kinds, kind]);

  const targets = useMemo(() => (data?.targets ?? []).filter((t) => t.kind === kind), [data, kind]);
  const packages = useMemo(() => (data?.packages ?? []).filter((p) => p.kind === kind), [data, kind]);
  const target = targets.find((t) => t.id === targetId) ?? null;
  const pkg = packages.find((p) => p.id === packageId) ?? null;

  useEffect(() => {
    if (!targets.some((t) => t.id === targetId)) setTargetId(targets.find((t) => t.active)?.id ?? targets[0]?.id ?? '');
  }, [targets, targetId]);
  useEffect(() => {
    if (!packages.some((p) => p.id === packageId)) setPackageId(packages[Math.min(1, packages.length - 1)]?.id ?? '');
  }, [packages, packageId]);

  async function buy() {
    if (!target || !pkg) return;
    setBusy(true);
    const res = await fetch('/api/promo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, targetId: target.id, packageId: pkg.id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); toast(d.error ?? 'Could not start the promotion'); return; }
    if (d.checkoutUrl) { window.location.assign(d.checkoutUrl); return; }
    setBusy(false);
    toast('Request sent — we will contact you with payment details');
    load();
  }

  async function cancel(c: PromoCampaign) {
    if (!confirm(`Cancel the request for “${c.targetName}”?`)) return;
    const res = await fetch(`/api/promo/${c.id}`, { method: 'DELETE' });
    toast(res.ok ? 'Request cancelled' : 'Not allowed');
    load();
  }

  if (error) return <div className="panel"><p className="muted">{error}</p></div>;
  if (!data) return <div className="panel"><p className="muted">Loading…</p></div>;

  const { campaigns, payments } = data;
  const live = campaigns.filter((c) => isLive(c));
  const paid = campaigns.filter((c) => c.status === 'active' || c.status === 'ended');
  const totals = paid.reduce((s, c) => ({
    impressions: s.impressions + c.impressions, clicks: s.clicks + c.clicks,
    spent: s.spent + c.priceCents,
  }), { impressions: 0, clicks: 0, spent: 0 });
  const liveForTarget = target ? campaigns.filter((c) => c.kind === kind && c.targetId === target.id && c.status === 'active') : [];
  const until = liveForTarget.reduce<string | null>((m, c) => (!m || (c.endsAt && c.endsAt > m) ? c.endsAt : m), null);

  return (
    <>
      <div className="panel promo-buy">
        <div className="promo__head">
          <div>
            <h3 className="with-ico"><Icon name="sparkle" size={20} /> Promote on Resoha</h3>
            <p className="muted small" style={{ marginTop: 4 }}>
              Featured items go first in search and catalogs, get a spot on the home page and carry a Featured badge.
            </p>
          </div>
        </div>

        {kinds.length === 0 ? (
          <div className="empty">
            <div className="empty__ico"><Icon name="sparkle" size={40} /></div>
            Add a listing or a development first — then you can promote it here.
          </div>
        ) : (
          <div className="promo__steps">
            <div className="promo__step">
              <span className="promo__num">1</span>
              <div className="promo__body">
                <b>What to promote</b>
                <div className="chip-row" style={{ margin: '10px 0' }}>
                  {kinds.map((k) => (
                    <button key={k} type="button" className={`chip-btn with-ico ${kind === k ? 'is-on' : ''}`} onClick={() => setKind(k)}>
                      <Icon name={KIND_ICON[k]} size={16} /> {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)} aria-label="Item to promote">
                  {targets.map((t) => (
                    <option key={t.id} value={t.id} disabled={!t.active}>
                      {t.name}{t.sub ? ` — ${t.sub}` : ''}{!t.active ? ' (unpublished)' : ''}{t.featured ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                {until && (
                  <p className="tiny muted" style={{ marginTop: 8 }}>
                    Already promoted until {fmtDate(until)} — a new package adds its days after that.
                  </p>
                )}
              </div>
            </div>

            <div className="promo__step">
              <span className="promo__num">2</span>
              <div className="promo__body">
                <b>How long</b>
                {packages.length === 0 ? (
                  <p className="muted small" style={{ marginTop: 8 }}>No packages for this type yet.</p>
                ) : (
                  <div className="promo__pkgs">
                    {packages.map((p) => (
                      <button key={p.id} type="button" className={`promo__pkg ${p.id === packageId ? 'is-on' : ''}`}
                        aria-pressed={p.id === packageId} onClick={() => setPackageId(p.id)}>
                        <span className="promo__days">{p.days} days</span>
                        <span className="promo__price">{fmtMoney(p.priceCents, p.currency)}</span>
                        <span className="tiny muted">{fmtMoney(Math.round(p.priceCents / p.days), p.currency)} / day</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="promo__step">
              <span className="promo__num">3</span>
              <div className="promo__body">
                <b>{payments === 'manual' ? 'Send the request' : 'Pay'}</b>
                <div className="promo__pay">
                  <button type="button" className="btn btn--primary" disabled={!target || !pkg || busy || !target.active} onClick={buy}>
                    {busy ? 'One moment…' : payments === 'manual'
                      ? `Request · ${pkg ? fmtMoney(pkg.priceCents, pkg.currency) : ''}`
                      : `Pay ${pkg ? fmtMoney(pkg.priceCents, pkg.currency) : ''}`}
                  </button>
                  <span className="tiny muted">
                    {payments === 'manual'
                      ? 'We will contact you with payment details; the promotion starts once payment arrives.'
                      : 'Secure card payment by Stripe. The promotion starts right after payment.'}
                  </span>
                </div>
                {payments === 'stripe-test' && (
                  <p className="tiny muted" style={{ marginTop: 8 }}>
                    Test mode: pay with card 4242 4242 4242 4242, any future date and any CVC.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 12 }}>My campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="muted small">No campaigns yet. Your promotions and their results will show up here.</p>
        ) : (
          <>
            <div className="stats">
              <div className="stat"><span className="muted small">Live now</span><b>{live.length}</b></div>
              <div className="stat"><span className="muted small">Impressions</span><b>{fmtNumber(totals.impressions)}</b></div>
              <div className="stat"><span className="muted small">Page visits</span><b>{fmtNumber(totals.clicks)}</b></div>
              <div className="stat"><span className="muted small">Spent</span><b>{fmtMoney(totals.spent)}</b></div>
            </div>
            <div className="promo__table">
              <table className="table">
                <thead><tr><th>Item</th><th>Period</th><th>Status</th><th>Impressions</th><th>Visits</th><th>CTR</th><th>Price</th><th></th></tr></thead>
                <tbody>
                  {campaigns.map((c) => {
                    const href = targetHref(c.kind, c.targetId);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="tiny muted">{KIND_LABEL[c.kind]}</div>
                          {href ? <Link href={href}>{c.targetName || '—'}</Link> : c.targetName || '—'}
                        </td>
                        <td className="small" data-label="Period">
                          {c.startsAt && c.endsAt ? `${fmtDate(c.startsAt)} – ${fmtDate(c.endsAt)}` : `${c.days} days`}
                        </td>
                        <td data-label="Status"><StatusPill c={c} /></td>
                        <td data-label="Impressions">{fmtNumber(c.impressions)}</td>
                        <td data-label="Visits">{fmtNumber(c.clicks)}</td>
                        <td data-label="CTR">{ctr(c)}</td>
                        <td data-label="Price">{fmtMoney(c.priceCents, c.currency)}</td>
                        <td>
                          {c.status === 'pending' && (
                            <button type="button" className="btn btn--sm btn--ghost btn--icon" title="Cancel request"
                              aria-label={`Cancel request: ${c.targetName}`} onClick={() => cancel(c)}>
                              <Icon name="trash" size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Impressions — how many times the item was shown in lists while promoted. Visits — opens of its page during the campaign.
            </p>
          </>
        )}
      </div>
    </>
  );
}
