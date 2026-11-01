'use client';
import { useState } from 'react';
import { useT } from './LangProvider';
import { toast } from './Toaster';
import { useMoney } from './CurrencyProvider';
import { UNIT_STATUSES, statusLabel, type UnitStatus } from '@/lib/units';
import type { Building, Listing } from '@/lib/types';

/**
 * Шахматка в кабінеті забудовника: клік по квартирі — вибір стану й ціни прямо в клітинці.
 * Найчастіша операція відділу продажів (бронь, продаж) — без пошуку квартири у списку.
 */
export default function UnitBoard({ units, buildings, onChanged }: { units: Listing[]; buildings: Building[]; onChanged: () => void }) {
  const t = useT();
  const money = useMoney();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<Record<string, Partial<Listing>>>({});
  const placed = units.filter((u) => u.floor !== null).map((u) => ({ ...u, ...local[u.id] }) as Listing);
  if (!placed.length) {
    return <p className="small muted">{t('Give units a floor and number in the price list to see them here as a floor grid.')}</p>;
  }

  async function save(u: Listing, patch: Partial<Listing>, done: string) {
    setBusy(true);
    const res = await fetch(`/api/listings/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    }).catch(() => null);
    setBusy(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast(d?.error ?? t('Not allowed'));
    setLocal((m) => ({ ...m, [u.id]: { ...m[u.id], ...patch } }));
    setOpen(null);
    toast(done);
    onChanged();
  }

  const groups = buildings.length > 1
    ? [...buildings.map((b) => ({ key: b.id, name: b.name, units: placed.filter((u) => u.buildingId === b.id) })),
      { key: '-', name: t('Other units'), units: placed.filter((u) => !u.buildingId || !buildings.some((b) => b.id === u.buildingId)) }]
    : [{ key: 'all', name: '', units: placed }];
  const byNo = (a: Listing, b: Listing) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true });
  const counts = Object.fromEntries(UNIT_STATUSES.map(([k]) => [k, placed.filter((u) => u.status === k).length])) as Record<UnitStatus, number>;

  return (
    <div className="units-form" style={{ marginTop: 0 }}>
      <div className="fgroup__head" style={{ marginBottom: 6 }}>
        <h4 style={{ margin: 0 }}>{t('Floor grid')}</h4>
        <div className="chess__legend tiny" style={{ margin: 0 }}>
          {UNIT_STATUSES.filter(([k]) => counts[k]).map(([k, label]) => (
            <span key={k}><i className={`chess__dot chess__dot--${k}`} /> {t(label)} · {counts[k]}</span>
          ))}
        </div>
      </div>
      <p className="tiny muted" style={{ margin: '0 0 10px' }}>{t('Tap a unit to mark it reserved or sold, or change its price.')}</p>
      {groups.filter((g) => g.units.length).map((g) => {
        const floors = [...new Set(g.units.map((u) => u.floor as number))].sort((a, b) => b - a);
        return (
          <div key={g.key} style={{ marginBottom: 14 }}>
            {g.name && <b className="small">{g.name}</b>}
            <div className="chess__grid">
              {floors.map((f) => (
                <div key={f} className="chess__floor">
                  <span className="chess__label tiny muted">{f}</span>
                  <div className="chess__units">
                    {g.units.filter((u) => u.floor === f).sort(byNo).map((u) => (
                      <div key={u.id}>
                        <button type="button" className={`chess__cell chess__cell--${u.status} ${open === u.id ? 'is-open' : ''}`}
                          onClick={() => setOpen(open === u.id ? null : u.id)} aria-expanded={open === u.id}>
                          <b>{u.unitNo || '—'}</b>
                          <span>{u.beds ? t('{n} bd', { n: u.beds }) : t('Studio')}</span>
                          <span>{money.short(u.price)}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const u = g.units.find((x) => x.id === open);
              return u && (
                <UnitPop key={u.id} unit={u} busy={busy} onClose={() => setOpen(null)}
                  onStatus={(st) => save(u, { status: st }, t('Unit {n}: {status}', { n: u.unitNo, status: t(statusLabel(st)) }))}
                  onPrice={(p) => save(u, { price: p }, t('Price updated'))} />
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

function UnitPop({ unit: u, busy, onStatus, onPrice, onClose }: {
  unit: Listing; busy: boolean; onStatus: (s: UnitStatus) => void; onPrice: (p: number) => void; onClose: () => void;
}) {
  const t = useT();
  const [price, setPrice] = useState(String(u.price || ''));
  return (
    <div className="ub__pop" role="dialog" aria-label={t('unit {n}', { n: u.unitNo })}>
      <div className="ub__head"><b>{t('unit {n}', { n: u.unitNo })}</b>
        <button type="button" className="link-btn small" onClick={onClose}>{t('Close')}</button></div>
      <div className="ub__statuses">
        {UNIT_STATUSES.filter(([k]) => k !== 'rented' || u.deal === 'rent').map(([k, label]) => (
          <button key={k} type="button" disabled={busy || u.status === k}
            className={`chip-btn ub__st ub__st--${k} ${u.status === k ? 'is-on' : ''}`} onClick={() => onStatus(k)}>
            {t(label)}
          </button>
        ))}
      </div>
      <form className="ub__price" onSubmit={(e) => { e.preventDefault(); const p = Number(price); if (p > 0 && p !== u.price) onPrice(p); }}>
        <label className="tiny muted">{t('Price, USD')}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input input--sm" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="btn btn--sm btn--primary" disabled={busy}>{t('Save')}</button>
        </div>
      </form>
      <a className="link-btn small" href={`/listings/${u.id}`} target="_blank" rel="noreferrer">{t('Open listing')} ↗</a>
    </div>
  );
}
