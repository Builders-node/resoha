'use client';
import { useState } from 'react';
import { toast } from './Toaster';
import { EMPTY_UNIT, UNIT_STATUSES, UNITS_MAX, parseUnits, type Unit } from '@/lib/units';

/**
 * Секція форми «Units & prices»: для будинку чи комплексу, де продається багато квартир.
 * Прайс можна вставити цілою таблицею або завести рядками.
 */
export default function UnitsEditor({
  value, onChange,
}: {
  value: Unit[];
  onChange: (next: Unit[]) => void;
}) {
  const [paste, setPaste] = useState('');

  const set = (i: number, patch: Partial<Unit>) =>
    onChange(value.map((u, j) => (j === i ? { ...u, ...patch } : u)));
  const numOrNull = (v: string) => (v === '' ? null : Number(v));

  function importPaste() {
    const rows = parseUnits(paste);
    if (!rows.length) return toast('No units found — paste rows of unit, type, floor, m², ft², price');
    onChange([...value, ...rows].slice(0, UNITS_MAX));
    setPaste('');
    toast(`Added ${rows.length} units`);
  }

  return (
    <div className="field full units-form">
      <label>Units &amp; prices</label>
      <span className="tiny muted" style={{ marginBottom: 10 }}>
        For a building or complex selling several apartments. Leave empty for a single property.
        With units, the listing price becomes the cheapest available unit and buyers see “From”.
      </span>

      {value.length > 0 && (
        <div className="units-edit">
          <div className="units-edit__head tiny muted">
            <span>Unit</span><span>Bedrooms</span><span>Floor</span><span>m²</span><span>ft²</span><span>Price, USD</span><span>Status</span><span />
          </div>
          {value.map((u, i) => (
            <div key={i} className="units-edit__row">
              <input className="input" value={u.unit} maxLength={20} aria-label="Unit"
                onChange={(e) => set(i, { unit: e.target.value })} />
              <select className="input" value={u.beds} aria-label="Bedrooms"
                onChange={(e) => set(i, { beds: Number(e.target.value) })}>
                {[0, 1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b ? `${b} BR` : 'Studio'}</option>)}
              </select>
              <input className="input" type="number" value={u.floor ?? ''} aria-label="Floor"
                onChange={(e) => set(i, { floor: numOrNull(e.target.value) })} />
              <input className="input" type="number" step="any" value={u.m2 ?? ''} aria-label="Size, m²"
                onChange={(e) => set(i, { m2: numOrNull(e.target.value) })} />
              <input className="input" type="number" value={u.sqft ?? ''} aria-label="Size, ft²"
                onChange={(e) => set(i, { sqft: numOrNull(e.target.value) })} />
              <input className="input" type="number" value={u.price || ''} aria-label="Price"
                onChange={(e) => set(i, { price: Number(e.target.value) || 0 })} />
              <select className="input" value={u.status} aria-label="Status"
                onChange={(e) => set(i, { status: e.target.value as Unit['status'] })}>
                {UNIT_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <button type="button" className="btn btn--ghost btn--sm" aria-label="Remove unit"
                onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--ghost btn--sm" disabled={value.length >= UNITS_MAX}
          onClick={() => onChange([...value, { ...EMPTY_UNIT }])}>+ Add unit</button>
        {value.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([])}>Clear all</button>
        )}
      </div>

      <textarea className="input" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)}
        placeholder={'Or paste a price list, one unit per row:\n201\tStudio\t2\t41.6\t448\t$143,368'} />
      {paste.trim() && (
        <button type="button" className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={importPaste}>
          Add pasted units
        </button>
      )}
    </div>
  );
}
