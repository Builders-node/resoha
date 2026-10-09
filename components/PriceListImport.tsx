'use client';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { parseCsv } from '@/lib/csv';
import { fmtUsd } from '@/lib/format';
import { PRICE_LIST_MAX, parsePriceTable, splitPaste, type PriceDiff, type PriceListRow, type UnitFields } from '@/lib/priceList';
import { statusLabel, toM2, unitTypeLabel } from '@/lib/units';
import { readXlsx } from '@/lib/xlsx';
import type { Building, Development } from '@/lib/types';

const FIELD_LABEL: Record<keyof UnitFields, string> = { price: 'Price', beds: 'Type', floor: 'Floor', sqft: 'Area', status: 'Status' };
const show = (k: keyof UnitFields, v: UnitFields[keyof UnitFields]) =>
  k === 'price' ? fmtUsd(Number(v))
    : k === 'beds' ? unitTypeLabel(Number(v))
      : k === 'sqft' ? `${toM2(Number(v))} m²`
        : k === 'status' ? statusLabel(String(v))
          : v ?? '—';

/**
 * Прайс забудовника: вставка, CSV або XLSX → перевірка змін → запис.
 * Квартири зіставляються за номером у ЖК: нові додаються, наявні оновлюються, дублів немає.
 */
export default function PriceListImport({ dev, buildings, onAdded }: { dev: Development; buildings: Building[]; onAdded: () => void }) {
  const [paste, setPaste] = useState('');
  const [fileRows, setFileRows] = useState<{ name: string; rows: PriceListRow[] } | null>(null);
  const [deal, setDeal] = useState<'sale' | 'rent'>('sale');
  const [buildingId, setBuildingId] = useState('');
  const [diff, setDiff] = useState<PriceDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const rows = () => fileRows?.rows ?? parsePriceTable(splitPaste(paste));
  const reset = () => setDiff(null);

  async function pickFile(file: File) {
    reset();
    try {
      const table = /\.xlsx$/i.test(file.name)
        ? await readXlsx(await file.arrayBuffer())
        : parseCsv(await file.text());
      const parsed = parsePriceTable(table);
      if (!parsed.length) return toast('No units found in this file — it needs unit and price columns');
      setFileRows({ name: file.name, rows: parsed });
    } catch (e) {
      toast(`Could not read ${file.name}: ${(e as Error).message}`);
    }
  }

  async function send(apply: boolean) {
    const list = rows();
    if (!list.length) return toast('No units found — one row per unit: unit, type, floor, m², ft², price');
    if (list.length > PRICE_LIST_MAX) return toast(`Up to ${PRICE_LIST_MAX} units at a time`);
    setBusy(true);
    const res = await fetch(`/api/developments/${dev.id}/price-list`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: list, deal, buildingId: buildingId || null, apply }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    if (!apply) return setDiff(data.diff);
    toast(`Price list saved: ${data.created} new, ${data.updated} updated`);
    setDiff(null); setPaste(''); setFileRows(null);
    onAdded();
  }

  const pending = diff ? diff.added.length + diff.changed.length : 0;

  return (
    <div className="units-form" style={{ marginTop: 24 }}>
      <label><b>Price list</b></label>
      <span className="tiny muted">
        Upload the developer&apos;s XLSX or CSV, or paste rows from the table. Columns: unit, type, floor, m², ft², price,
        and optionally status — with a header row the order doesn&apos;t matter. Units are matched by number in {dev.name}:
        new numbers become new listings with this development&apos;s photos, address and pin; existing ones get the new price,
        area and status. You&apos;ll see every change before it&apos;s saved.
      </span>
      <div className="chip-row">
        <button type="button" className={`chip-btn ${deal === 'sale' ? 'is-on' : ''}`} onClick={() => { setDeal('sale'); reset(); }}>For sale</button>
        <button type="button" className={`chip-btn ${deal === 'rent' ? 'is-on' : ''}`} onClick={() => { setDeal('rent'); reset(); }}>For rent</button>
      </div>
      {buildings.length > 0 && (
        <select className="input" value={buildingId} onChange={(e) => { setBuildingId(e.target.value); reset(); }} style={{ maxWidth: 320 }}>
          <option value="">Whole development</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      <div className="chip-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileInput.current?.click()}>
          <Icon name="plus" size={16} /> Upload XLSX or CSV
        </button>
        {fileRows && (
          <span className="small">
            <b>{fileRows.name}</b> · {fileRows.rows.length} units{' '}
            <button type="button" className="link-btn small" onClick={() => { setFileRows(null); reset(); }}>Remove</button>
          </span>
        )}
        <input ref={fileInput} type="file" hidden
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
      </div>
      {!fileRows && (
        <textarea className="input" rows={6} value={paste} onChange={(e) => { setPaste(e.target.value); reset(); }}
          placeholder={'201\tStudio\t2\t41.6\t448\t$143,368\n507\t2 Bedroom\t5\t65.5\t705\t$239,319'} />
      )}

      {!diff && (
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }}
          disabled={busy || (!fileRows && !paste.trim())} onClick={() => send(false)}>
          {busy ? 'Checking…' : 'Check changes'}
        </button>
      )}

      {diff && (
        <div className="imp-preview">
          <div className="imp-sum">
            <span className="pill pill--on">{diff.added.length} new</span>
            <span className="pill pill--warn">{diff.changed.length} updated</span>
            <span className="pill pill--off">{diff.unchanged} unchanged</span>
            {diff.errors.length > 0 && <span className="pill imp-pill--err">{diff.errors.length} skipped</span>}
          </div>

          {diff.errors.length > 0 && (
            <ul className="imp-errors small">
              {diff.errors.map((e, i) => <li key={i}><b>Unit {e.unit}</b>: {e.message}</li>)}
            </ul>
          )}

          {diff.changed.length > 0 && (
            <div className="imp-table-wrap">
              <table className="table imp-table">
                <thead><tr><th>Unit</th><th>Changes</th></tr></thead>
                <tbody>
                  {diff.changed.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.unit}</b></td>
                      <td>
                        {c.fields.map((f) => (
                          <span key={f} className="imp-change">
                            {FIELD_LABEL[f]}: <s>{show(f, c.before[f])}</s> → <b>{show(f, c.after[f])}</b>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {diff.added.length > 0 && (
            <div className="imp-table-wrap">
              <table className="table imp-table">
                <thead><tr><th>New unit</th><th>Type</th><th>Floor</th><th>Area</th><th>Price</th></tr></thead>
                <tbody>
                  {diff.added.map((r) => (
                    <tr key={r.unit}>
                      <td><b>{r.unit}</b></td><td>{unitTypeLabel(r.beds)}</td><td>{r.floor ?? '—'}</td>
                      <td>{toM2(r.sqft)} m²</td><td>{fmtUsd(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="chip-row">
            <button type="button" className="btn btn--primary" disabled={busy || !pending} onClick={() => send(true)}>
              {busy ? 'Saving…' : pending ? `Apply ${pending} ${pending === 1 ? 'change' : 'changes'}` : 'Nothing to change'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
