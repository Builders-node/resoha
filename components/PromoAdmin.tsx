'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { StatusPill, ctr, targetHref } from './PromotePanel';
import { toast } from './Toaster';
import { fmtDate, fmtNumber } from '@/lib/format';
import { KIND_LABEL, PROMO_KINDS, fmtMoney, isLive, type PromoCampaign, type PromoKind, type PromoPackage } from '@/lib/promoShared';

type Filter = 'all' | 'pending' | 'live' | 'ended' | 'cancelled';
const FILTERS: { v: Filter; label: string }[] = [
  { v: 'all', label: 'All' }, { v: 'pending', label: 'Awaiting payment' }, { v: 'live', label: 'Live' },
  { v: 'ended', label: 'Ended' }, { v: 'cancelled', label: 'Cancelled' },
];
const PAYMENTS: Record<string, string> = {
  stripe: 'Card payments by Stripe (live).',
  'stripe-test': 'Card payments by Stripe in test mode — no real money is charged.',
  manual: 'Stripe is not connected: requests wait here until you mark them paid.',
};

/** Вкладка адмінки Promotions: виручка, усі кампанії з діями і ціни пакетів. */
export default function PromoAdmin() {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [packages, setPackages] = useState<PromoPackage[]>([]);
  const [payments, setPayments] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/promo');
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.unavailable ? 'Run migration 0046 to turn on promotions.' : d.error ?? 'Could not load'); return; }
    setCampaigns(d.campaigns ?? []); setPackages(d.packages ?? []); setPayments(d.payments ?? '');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: object, ok: string) {
    const res = await fetch('/api/admin/promo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? ok : d.error ?? 'Not allowed');
    load();
    return res.ok;
  }

  const stats = useMemo(() => {
    const month = now - 30 * 86400000;
    const paid = campaigns.filter((c) => c.status === 'active' || c.status === 'ended');
    return {
      revenue: paid.reduce((s, c) => s + c.priceCents, 0),
      month: paid.filter((c) => c.paidAt && new Date(c.paidAt).getTime() >= month).reduce((s, c) => s + c.priceCents, 0),
      live: campaigns.filter((c) => isLive(c)).length,
      pending: campaigns.filter((c) => c.status === 'pending').length,
    };
  }, [campaigns, now]);

  const shown = campaigns.filter((c) => {
    if (filter === 'live' && !isLive(c)) return false;
    if (filter !== 'all' && filter !== 'live' && c.status !== filter) return false;
    const needle = q.trim().toLowerCase();
    return !needle || [c.targetName, c.ownerName].some((h) => (h ?? '').toLowerCase().includes(needle));
  });

  if (error) return <div className="panel"><p className="muted">{error}</p></div>;

  return (
    <>
      <div className="stats">
        <div className="stat"><span className="muted small">Revenue, all time</span><b>{fmtMoney(stats.revenue)}</b></div>
        <div className="stat"><span className="muted small">Last 30 days</span><b>{fmtMoney(stats.month)}</b></div>
        <div className="stat"><span className="muted small">Live now</span><b>{stats.live}</b></div>
        <div className="stat"><span className="muted small">Awaiting payment</span><b>{stats.pending}</b></div>
      </div>

      <div className="panel">
        <div className="fgroup__head">
          <h3>Campaigns</h3>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Search item or owner" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {payments && <p className="tiny muted" style={{ margin: '4px 0 12px' }}>{PAYMENTS[payments]}</p>}
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <button key={f.v} type="button" className={`chip-btn ${filter === f.v ? 'is-on' : ''}`} onClick={() => setFilter(f.v)}>{f.label}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="muted small">{busy ? 'Loading…' : 'No campaigns here yet.'}</p>
        ) : (
          <div className="promo__table">
            <table className="table">
              <thead><tr><th>Item</th><th>Owner</th><th>Period</th><th>Status</th><th>Impr.</th><th>Visits</th><th>CTR</th><th>Price</th><th></th></tr></thead>
              <tbody>
                {shown.map((c) => {
                  const href = targetHref(c.kind, c.targetId);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="tiny muted">{KIND_LABEL[c.kind]} · {c.days} days</div>
                        {href ? <Link href={href}>{c.targetName || '—'}</Link> : c.targetName || '—'}
                      </td>
                      <td className="small" data-label="Owner">{c.ownerName ?? '—'}</td>
                      <td className="small" data-label="Period">
                        {c.startsAt && c.endsAt ? `${fmtDate(c.startsAt)} – ${fmtDate(c.endsAt)}` : `requested ${fmtDate(c.createdAt)}`}
                      </td>
                      <td data-label="Status"><StatusPill c={c} />{c.payMethod && <div className="tiny muted">{c.payMethod === 'stripe' ? 'Stripe' : 'Manual'}</div>}</td>
                      <td data-label="Impressions">{fmtNumber(c.impressions)}</td>
                      <td data-label="Visits">{fmtNumber(c.clicks)}</td>
                      <td data-label="CTR">{ctr(c)}</td>
                      <td data-label="Price">{fmtMoney(c.priceCents, c.currency)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.status === 'pending' && (
                          <button type="button" className="btn btn--sm btn--ghost btn--icon" title="Mark paid and start"
                            aria-label={`Mark paid: ${c.targetName}`}
                            onClick={() => confirm(`Mark “${c.targetName}” as paid (${fmtMoney(c.priceCents, c.currency)}) and start it now?`)
                              && post({ action: 'activate', id: c.id }, 'Campaign started')}>
                            <Icon name="check" size={16} />
                          </button>
                        )}
                        {(c.status === 'pending' || c.status === 'active') && (
                          <button type="button" className="btn btn--sm btn--ghost btn--icon" title="Cancel campaign"
                            aria-label={`Cancel: ${c.targetName}`}
                            onClick={() => confirm(c.status === 'active'
                              ? `Stop “${c.targetName}” now? Refund the payment in Stripe separately if needed.`
                              : `Cancel the request for “${c.targetName}”?`)
                              && post({ action: 'cancel', id: c.id }, 'Campaign cancelled')}>
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
        )}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Prices</h3>
        <p className="muted small" style={{ marginBottom: 14 }}>
          What agents see on the Promote tab. Changes apply to new purchases only.
        </p>
        <div className="promo__prices">
          {PROMO_KINDS.map((k) => (
            <PriceGroup key={k} kind={k} packages={packages.filter((p) => p.kind === k)}
              onSave={(body) => post({ action: 'package', ...body }, 'Price saved')} />
          ))}
        </div>
      </div>
    </>
  );
}

type PkgInput = { id?: string; kind: PromoKind; days: number; priceCents: number; active: boolean };

function PriceGroup({ kind, packages, onSave }: { kind: PromoKind; packages: PromoPackage[]; onSave: (b: PkgInput) => Promise<boolean> }) {
  const [days, setDays] = useState('');
  const [price, setPrice] = useState('');
  return (
    <div className="promo__group">
      <b>{KIND_LABEL[kind]}</b>
      {packages.map((p) => <PriceRow key={`${p.id}:${p.priceCents}:${p.active}`} p={p} onSave={onSave} />)}
      <form className="promo__row" onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave({ kind, days: Number(days), priceCents: Math.round(Number(price) * 100), active: true })) {
          setDays(''); setPrice('');
        }
      }}>
        <input className="input" type="number" min={1} max={365} placeholder="Days" value={days} onChange={(e) => setDays(e.target.value)} aria-label={`New ${kind} package days`} />
        <input className="input" type="number" min={0} step="0.01" placeholder="Price $" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`New ${kind} package price`} />
        <button className="btn btn--sm btn--ghost btn--icon" title="Add package" aria-label={`Add ${kind} package`} disabled={!days || price === ''}>
          <Icon name="plus" size={16} />
        </button>
      </form>
    </div>
  );
}

function PriceRow({ p, onSave }: { p: PromoPackage; onSave: (b: PkgInput) => Promise<boolean> }) {
  const [price, setPrice] = useState(String(p.priceCents / 100));
  const changed = Math.round(Number(price) * 100) !== p.priceCents;
  return (
    <div className={`promo__row ${p.active ? '' : 'is-off'}`}>
      <span className="promo__rowdays">{p.days} days</span>
      <input className="input" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
        aria-label={`${p.days} days price`} />
      <button type="button" className="btn btn--sm btn--ghost btn--icon" title={changed ? 'Save price' : p.active ? 'Hide package' : 'Show package'}
        aria-label={changed ? 'Save price' : p.active ? 'Hide package' : 'Show package'}
        onClick={() => onSave({ id: p.id, kind: p.kind, days: p.days, priceCents: Math.round(Number(price) * 100), active: changed ? p.active : !p.active })}>
        <Icon name={changed ? 'check' : p.active ? 'close' : 'plus'} size={16} />
      </button>
    </div>
  );
}
