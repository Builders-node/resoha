'use client';
import { useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { UNIT_STATUSES } from '@/lib/units';
import type { Listing } from '@/lib/types';

type Mode = '' | 'price' | 'status';

/**
 * Панель масових дій над вибраними оголошеннями: ціна (точна чи ±%), стан продажу,
 * зняти з показу, видалити. Усе йде одним запитом у /api/listings/bulk.
 */
export default function BulkBar({ listings, onClear, onDone }: {
  listings: Listing[];
  onClear: () => void;
  /** keep — лишити вибір (коли частина не вдалась і є що повторити) */
  onDone: (keep: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>('');
  const [priceMode, setPriceMode] = useState<'percent' | 'set'>('percent');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<string>(UNIT_STATUSES[0][0]);
  const [busy, setBusy] = useState(false);
  const n = listings.length;
  const word = n === 1 ? 'listing' : 'listings';

  async function run(body: Record<string, unknown>, done: string) {
    setBusy(true);
    const res = await fetch('/api/listings/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: listings.map((l) => l.id), ...body }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (d.error) return toast(d.error);
    const failed = (d.failed ?? []).length;
    toast(failed ? `${done}: ${d.done} of ${n}. ${failed} not allowed or failed.` : `${done}: ${d.done} ${d.done === 1 ? 'listing' : 'listings'}`);
    setMode(''); setValue('');
    onDone(failed > 0 && d.done === 0);
  }

  function applyPrice(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(value.replace(/[$,\s%]/g, ''));
    if (!Number.isFinite(v) || v === 0) return toast('Enter a number');
    run({ action: 'price', mode: priceMode, value: v }, 'Price updated');
  }

  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <div className="bulk-bar__row">
        <b>{n} {word} selected</b>
        <button type="button" className={`btn btn--sm btn--ghost ${mode === 'price' ? 'is-on' : ''}`} disabled={busy}
          onClick={() => setMode(mode === 'price' ? '' : 'price')}>Change price</button>
        <button type="button" className={`btn btn--sm btn--ghost ${mode === 'status' ? 'is-on' : ''}`} disabled={busy}
          onClick={() => setMode(mode === 'status' ? '' : 'status')}>Set status</button>
        <button type="button" className="btn btn--sm btn--ghost" disabled={busy}
          onClick={() => confirm(`Take down ${n} ${word}? Buyers will stop seeing them; you can publish them again later.`)
            && run({ action: 'takedown' }, 'Taken down')}>Take down</button>
        <button type="button" className="btn btn--sm btn--danger" disabled={busy}
          onClick={() => confirm(`Delete ${n} ${word} for good? This cannot be undone.`) && run({ action: 'delete' }, 'Deleted')}>
          <Icon name="trash" size={15} /> Delete
        </button>
        <button type="button" className="link-btn small" onClick={onClear}>Clear selection</button>
      </div>

      {mode === 'price' && (
        <form className="bulk-bar__row" onSubmit={applyPrice}>
          <select className="input input--sm" value={priceMode} onChange={(e) => setPriceMode(e.target.value as 'percent' | 'set')}
            aria-label="How to change the price">
            <option value="percent">Change by %</option>
            <option value="set">Set the same price</option>
          </select>
          <input className="input input--sm" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder={priceMode === 'percent' ? 'e.g. -5 or 10' : 'e.g. 250000'} aria-label="Value" style={{ width: 150 }} />
          <button className="btn btn--sm btn--primary" disabled={busy || !value.trim()}>Apply to {n}</button>
          <span className="tiny muted">
            {priceMode === 'percent' ? 'Negative lowers the price; buyers who saved a listing hear about a drop.' : 'Every selected listing gets this exact price.'}
          </span>
        </form>
      )}

      {mode === 'status' && (
        <form className="bulk-bar__row" onSubmit={(e) => { e.preventDefault(); run({ action: 'status', status }, 'Status updated'); }}>
          <select className="input input--sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            {UNIT_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <button className="btn btn--sm btn--primary" disabled={busy}>Apply to {n}</button>
          <span className="tiny muted">Sold and rented listings leave the general search; development units stay on the development page.</span>
        </form>
      )}
    </div>
  );
}
