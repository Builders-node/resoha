'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import { AREA_CENTRES, NEIGHBORHOODS } from '@/lib/format';
import { RENTAL_RULES, SALES_STATUSES, salesLabel } from '@/lib/units';
import type { Development } from '@/lib/types';

/**
 * Вкладка «Developments» у кабінеті: ЖК ріелтора, форма ЖК і заливка прайсу.
 * Кожен рядок прайсу стає окремим оголошенням-квартирою в цьому ЖК.
 */
export default function DevelopmentsPanel({ onUnitsAdded }: { onUnitsAdded: () => void }) {
  const [items, setItems] = useState<Development[]>([]);
  const [editing, setEditing] = useState<Development | 'new' | null>(null);

  const load = useCallback(async () => {
    const d = await fetch('/api/developments?mine=1').then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (editing) {
    return (
      <DevelopmentForm
        dev={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={(d) => { load(); setEditing(d); }}
        onUnitsAdded={onUnitsAdded}
      />
    );
  }

  return (
    <div className="panel">
      <div className="fgroup__head">
        <h3>My developments</h3>
        <button className="btn" onClick={() => setEditing('new')}>+ New development</button>
      </div>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        A development has its own page with every unit grouped by type. Each unit is a normal listing — for sale or for rent.
      </p>
      {!items.length && <p className="muted">No developments yet.</p>}
      <div className="dev-list">
        {items.map((d) => (
          <div key={d.id} className="dev-list__row">
            <div>
              <b>{d.name}</b>
              <div className="small muted">
                {d.neighborhood} · {salesLabel(d.sales)}{d.completion && ` · ${d.completion}`}{!d.active && ' · hidden'}
              </div>
            </div>
            <div className="chip-row">
              <Link className="btn btn--ghost btn--sm" href={`/developments/${d.slug}`} target="_blank">Open page</Link>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(d)}>Edit &amp; add units</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DevelopmentForm({ dev, onCancel, onSaved, onUnitsAdded }: {
  dev: Development | null;
  onCancel: () => void;
  onSaved: (d: Development) => void;
  onUnitsAdded: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>(dev?.photos ?? []);
  const [area, setArea] = useState(dev?.neighborhood ?? 'West Bay');
  const [pin, setPin] = useState<[number, number]>(dev ? [dev.lat, dev.lng] : AREA_CENTRES['West Bay']);
  const [saving, setSaving] = useState(false);
  const [paste, setPaste] = useState('');
  const [deal, setDeal] = useState<'sale' | 'rent'>('sale');

  function pickArea(next: string) {
    setArea(next);
    if (AREA_CENTRES[next]) setPin(AREA_CENTRES[next]);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const res = await fetch(dev ? `/api/developments/${dev.id}` : '/api/developments', {
      method: dev ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...Object.fromEntries(fd.entries()),
        neighborhood: area, lat: pin[0], lng: pin[1], photos,
        active: fd.get('active') === 'on',
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(dev ? 'Development updated' : 'Development created — now add its units');
    onSaved(data.development);
  }

  async function addUnits() {
    if (!dev) return;
    setSaving(true);
    const res = await fetch(`/api/developments/${dev.id}/units`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: paste, deal }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(`Added ${data.created} units`);
    setPaste('');
    onUnitsAdded();
  }

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 14 }}>{dev ? `Edit ${dev.name}` : 'New development'}</h3>
      <form className="form-grid" onSubmit={submit}>
        <div className="field full"><label>Name</label>
          <input className="input" name="name" required maxLength={120} defaultValue={dev?.name} placeholder="Ocean View Residences" /></div>
        <div className="field"><label>Developer</label>
          <input className="input" name="developer" maxLength={120} defaultValue={dev?.developer} /></div>
        <div className="field"><label>Completion</label>
          <input className="input" name="completion" maxLength={40} defaultValue={dev?.completion} placeholder="Q4 2026" /></div>
        <div className="field"><label>Sales</label>
          <select className="input" name="sales" defaultValue={dev?.sales ?? 'open'}>
            {SALES_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>
        <div className="field"><label>Project website</label>
          <input className="input" name="website" maxLength={200} defaultValue={dev?.website} placeholder="example.com" /></div>
        <div className="field"><label>Area</label>
          <select className="input" value={area} onChange={(e) => pickArea(e.target.value)}>
            {[...new Set([...NEIGHBORHOODS, area])].map((n) => <option key={n} value={n}>{n}</option>)}
          </select></div>
        <div className="field"><label>Address</label>
          <input className="input" name="address" maxLength={120} defaultValue={dev?.address} /></div>
        <div className="field"><label>Latitude</label>
          <input className="input" type="number" step="0.0001" value={pin[0]} onChange={(e) => setPin([Number(e.target.value), pin[1]])} /></div>
        <div className="field"><label>Longitude</label>
          <input className="input" type="number" step="0.0001" value={pin[1]} onChange={(e) => setPin([pin[0], Number(e.target.value)])} /></div>
        <div className="field"><label>Floors</label>
          <input className="input" name="floors" type="number" min={1} max={200} defaultValue={dev?.floors ?? ''} /></div>
        <div className="field"><label>Construction</label>
          <input className="input" name="construction" maxLength={120} defaultValue={dev?.construction} placeholder="Reinforced concrete" /></div>
        <div className="field"><label>Parking</label>
          <input className="input" name="parking" maxLength={120} defaultValue={dev?.parking} placeholder="Covered, 1 space per unit" /></div>
        <div className="field"><label>HOA, $ per month</label>
          <input className="input" name="hoa" type="number" min={0} defaultValue={dev?.hoa ?? ''} placeholder="Leave empty if unknown" /></div>
        <div className="field"><label>Rentals</label>
          <select className="input" name="rentals" defaultValue={dev?.rentals ?? ''}>
            {RENTAL_RULES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>
        <div className="field full"><label>Amenities</label>
          <input className="input" name="amenities" maxLength={600} defaultValue={dev?.amenities.join(', ')}
            placeholder="Pool, gym, rooftop terrace, 24/7 security" />
          <span className="tiny muted">Comma-separated.</span></div>
        <div className="field full"><label>Payment plan</label>
          <textarea className="input" name="payment" rows={4} maxLength={2000} defaultValue={dev?.payment}
            placeholder={'10% reservation deposit\n40% on signing\n50% on delivery'} />
          <span className="tiny muted">One step per line.</span></div>
        <div className="field full"><label>Photos</label>
          <PhotoUploader value={photos} onChange={setPhotos} /></div>
        <div className="field full"><label>Description</label>
          <textarea className="input" name="text" rows={5} maxLength={8000} defaultValue={dev?.text} /></div>
        <div className="field full switch-inline">
          <label><input type="checkbox" name="active" defaultChecked={dev?.active ?? true} /> Published</label>
        </div>
        <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
          <button className="btn" disabled={saving}>{dev ? 'Save' : 'Create development'}</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Back</button>
        </div>
      </form>

      {dev && (
        <div className="units-form" style={{ marginTop: 22 }}>
          <label><b>Add units from a price list</b></label>
          <span className="tiny muted">
            Paste rows from the developer&apos;s table: unit, type, floor, m², ft², price — one unit per row.
            Each row becomes its own listing in {dev.name}, with this development&apos;s photos, address and pin.
            Edit a single unit (status, photos, price) from the Listings tab.
          </span>
          <div className="chip-row">
            <button type="button" className={`chip-btn ${deal === 'sale' ? 'is-on' : ''}`} onClick={() => setDeal('sale')}>For sale</button>
            <button type="button" className={`chip-btn ${deal === 'rent' ? 'is-on' : ''}`} onClick={() => setDeal('rent')}>For rent</button>
          </div>
          <textarea className="input" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)}
            placeholder={'201\tStudio\t2\t41.6\t448\t$143,368\n507\t2 Bedroom\t5\t65.5\t705\t$239,319'} />
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={saving || !paste.trim()} onClick={addUnits}>
            Add units
          </button>
        </div>
      )}
    </div>
  );
}
