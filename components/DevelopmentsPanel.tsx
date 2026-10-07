'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import { uploadPhotos } from '@/lib/uploadPhotos';
import { AREA_CENTRES, NEIGHBORHOODS } from '@/lib/format';
import { BUILDING_STAGES, DOC_KINDS, RENTAL_RULES, SALES_STATUSES, salesLabel, stageLabel } from '@/lib/units';
import type { Building, Development, DevelopmentDocument } from '@/lib/types';

/**
 * Вкладка «Developments» у кабінеті: ЖК ріелтора, форма ЖК і заливка прайсу.
 * Кожен рядок прайсу стає окремим оголошенням-квартирою в цьому ЖК.
 */
export default function DevelopmentsPanel({ onUnitsAdded, isAdmin = false }: { onUnitsAdded: () => void; isAdmin?: boolean }) {
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
        isAdmin={isAdmin}
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

function DevelopmentForm({ dev, onCancel, onSaved, onUnitsAdded, isAdmin }: {
  isAdmin: boolean;
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
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');

  const loadBuildings = useCallback(async () => {
    if (!dev) return;
    const d = await fetch(`/api/developments/${dev.id}/buildings`).then((r) => r.json()).catch(() => ({}));
    setBuildings(d.items ?? []);
  }, [dev]);
  useEffect(() => { loadBuildings(); }, [loadBuildings]);

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
      body: JSON.stringify({ text: paste, deal, buildingId: buildingId || null }),
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
        <div className="field"><label>Class</label>
          <input className="input" name="projectClass" maxLength={60} defaultValue={dev?.projectClass} placeholder="Luxury" /></div>
        <div className="field"><label>Walls</label>
          <input className="input" name="walls" maxLength={120} defaultValue={dev?.walls} placeholder="Concrete block" /></div>
        <div className="field"><label>Insulation</label>
          <input className="input" name="insulation" maxLength={120} defaultValue={dev?.insulation} /></div>
        <div className="field"><label>Cooling &amp; heating</label>
          <input className="input" name="climate" maxLength={120} defaultValue={dev?.climate} placeholder="Split A/C in every room" /></div>
        <div className="field"><label>Ceiling height</label>
          <input className="input" name="ceiling" maxLength={60} defaultValue={dev?.ceiling} placeholder="2.8 m" /></div>
        <div className="field"><label>Finish</label>
          <input className="input" name="finish" maxLength={120} defaultValue={dev?.finish} placeholder="Turnkey, furnished" /></div>
        <div className="field"><label>Grounds</label>
          <input className="input" name="territory" maxLength={120} defaultValue={dev?.territory} placeholder="Gated, 24/7 security" /></div>
        <div className="field"><label>Backup power</label>
          <input className="input" name="backupPower" maxLength={120} defaultValue={dev?.backupPower} placeholder="Generator for common areas" /></div>
        <div className="field"><label>Water supply</label>
          <input className="input" name="water" maxLength={120} defaultValue={dev?.water} placeholder="Cistern + municipal" /></div>
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
        <div className="field"><label>Video link</label>
          <input className="input" name="video" maxLength={500} defaultValue={dev?.video} placeholder="https://youtube.com/watch?v=…" />
          <span className="tiny muted">YouTube or Vimeo — plays right on the page.</span></div>
        <div className="field"><label>360° tour or drone flyover</label>
          <input className="input" name="tour" maxLength={500} defaultValue={dev?.tour} placeholder="https://my.matterport.com/show/?m=…" />
          <span className="tiny muted">Matterport, Kuula or a YouTube 360 video.</span></div>
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

      {dev && <BuildingsEditor devId={dev.id} items={buildings} onChange={loadBuildings} />}

      {dev && <DocumentsEditor devId={dev.id} isAdmin={isAdmin} />}

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
          {buildings.length > 0 && (
            <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} style={{ maxWidth: 320 }}>
              <option value="">No building</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>Into {b.name}</option>)}
            </select>
          )}
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

/** Доми ЖК: список, додавання й правка в рядку. Квартири привʼязуються при заливці прайсу або у формі квартири. */
function BuildingsEditor({ devId, items, onChange }: { devId: string; items: Building[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Building | 'new' | null>(null);
  const [photo, setPhoto] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function open(b: Building | 'new') {
    setEditing(b);
    setPhoto(b !== 'new' && b.photo ? [b.photo] : []);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const res = await fetch(editing === 'new' ? `/api/developments/${devId}/buildings` : `/api/buildings/${editing.id}`, {
      method: editing === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), photo: photo[0] ?? '' }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(editing === 'new' ? 'Building added' : 'Building updated');
    setEditing(null);
    onChange();
  }

  async function remove(b: Building) {
    if (!confirm(`Delete ${b.name}? Its units stay in the development.`)) return;
    const res = await fetch(`/api/buildings/${b.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Could not delete');
    onChange();
  }

  const b = editing === 'new' ? null : editing;
  return (
    <div className="units-form" style={{ marginTop: 22 }}>
      <div className="fgroup__head">
        <label><b>Buildings</b></label>
        {!editing && <button type="button" className="btn btn--ghost btn--sm" onClick={() => open('new')}>+ Add building</button>}
      </div>
      <span className="tiny muted">Each building gets its own card with construction status and its own floor grid on the page.</span>
      {!editing && (
        <div className="dev-list">
          {!items.length && <p className="muted small">No buildings yet — units without a building are shown together.</p>}
          {items.map((x) => (
            <div key={x.id} className="dev-list__row">
              <div>
                <b>{x.name}</b>
                <div className="small muted">
                  {stageLabel(x.stage)}{x.floors ? ` · ${x.floors} floors` : ''}{x.completion && ` · ${x.completion}`}
                </div>
              </div>
              <div className="chip-row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => open(x)}>Edit</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(x)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <form className="form-grid" onSubmit={save} key={b?.id ?? 'new'}>
          <div className="field"><label>Name</label>
            <input className="input" name="name" required maxLength={60} defaultValue={b?.name} placeholder="Building A" /></div>
          <div className="field"><label>Stage</label>
            <select className="input" name="stage" defaultValue={b?.stage ?? 'construction'}>
              {BUILDING_STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></div>
          <div className="field"><label>Floors</label>
            <input className="input" name="floors" type="number" min={1} max={200} defaultValue={b?.floors ?? ''} /></div>
          <div className="field"><label>Completion</label>
            <input className="input" name="completion" maxLength={40} defaultValue={b?.completion} placeholder="Q4 2026" /></div>
          <div className="field full"><label>Address</label>
            <input className="input" name="address" maxLength={120} defaultValue={b?.address} /></div>
          <div className="field"><label>Order on the page</label>
            <input className="input" name="sort" type="number" defaultValue={b?.sort ?? items.length} /></div>
          <div className="field full"><label>Photo</label>
            <PhotoUploader value={photo} onChange={setPhoto} max={1} /></div>
          <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
            <button className="btn" disabled={saving}>{b ? 'Save building' : 'Add building'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Документи ЖК: право на землю, дозволи, акт введення. Файл — PDF або фото скану. */
function DocumentsEditor({ devId, isAdmin }: { devId: string; isAdmin: boolean }) {
  const [items, setItems] = useState<DevelopmentDocument[]>([]);
  const [editing, setEditing] = useState<DevelopmentDocument | 'new' | null>(null);
  const [file, setFile] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch(`/api/developments/${devId}/documents`).then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, [devId]);
  useEffect(() => { load(); }, [load]);

  function open(d: DevelopmentDocument | 'new') {
    setEditing(d);
    setFile(d !== 'new' ? d.file : '');
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    const res = await uploadPhotos([f]);
    setBusy(false);
    if ('error' in res) return toast(res.error);
    setFile(res.urls[0]);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const res = await fetch(editing === 'new' ? `/api/developments/${devId}/documents` : `/api/documents/${editing.id}`, {
      method: editing === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), file, ...(isAdmin ? { verified: fd.get('verified') === 'on' } : {}) }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(editing === 'new' ? 'Document added' : 'Document updated');
    setEditing(null);
    load();
  }

  async function remove(d: DevelopmentDocument) {
    if (!confirm(`Delete “${d.title}”?`)) return;
    const res = await fetch(`/api/documents/${d.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Could not delete');
    load();
  }

  const d = editing === 'new' ? null : editing;
  return (
    <div className="units-form" style={{ marginTop: 22 }}>
      <div className="fgroup__head">
        <label><b>Documents</b></label>
        {!editing && <button type="button" className="btn btn--ghost btn--sm" onClick={() => open('new')}>+ Add document</button>}
      </div>
      <span className="tiny muted">Land title, construction permit, environmental licence, completion certificate — buyers check these first.</span>
      {!editing && (
        <div className="dev-list">
          {!items.length && <p className="muted small">No documents yet.</p>}
          {items.map((x) => (
            <div key={x.id} className="dev-list__row">
              <div>
                <b>{x.title}</b>
                <div className="small muted">
                  {DOC_KINDS.find(([k]) => k === x.kind)?.[1]}{x.number && ` · No. ${x.number}`}{x.issued && ` · ${x.issued}`}
                  {x.file ? ' · file attached' : ''}{x.verified ? ' · checked' : ''}
                </div>
              </div>
              <div className="chip-row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => open(x)}>Edit</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(x)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <form className="form-grid" onSubmit={save} key={d?.id ?? 'new'}>
          <div className="field"><label>Type</label>
            <select className="input" name="kind" defaultValue={d?.kind ?? 'permit'}>
              {DOC_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></div>
          <div className="field"><label>Title</label>
            <input className="input" name="title" required maxLength={120} defaultValue={d?.title} placeholder="Municipal construction permit" /></div>
          <div className="field"><label>Number</label>
            <input className="input" name="number" maxLength={60} defaultValue={d?.number} /></div>
          <div className="field"><label>Issued</label>
            <input className="input" name="issued" maxLength={40} defaultValue={d?.issued} placeholder="March 2025" /></div>
          <div className="field full"><label>Note</label>
            <input className="input" name="note" maxLength={300} defaultValue={d?.note} placeholder="Issued by the Municipality of Roatán" /></div>
          <div className="field"><label>Order on the page</label>
            <input className="input" name="sort" type="number" defaultValue={d?.sort ?? items.length} /></div>
          <div className="field full"><label>File</label>
            <div className="chip-row" style={{ alignItems: 'center' }}>
              <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                {busy ? 'Uploading…' : file ? 'Replace file' : 'Upload PDF or scan'}
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={pick} disabled={busy} />
              </label>
              {file && <a className="small" href={file} target="_blank" rel="noreferrer">Open current file</a>}
              {file && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFile('')}>Remove</button>}
            </div>
            <span className="tiny muted">PDF up to 20 MB, or a photo up to 8 MB.</span></div>
          {isAdmin && (
            <div className="field full switch-inline">
              <label><input type="checkbox" name="verified" defaultChecked={d?.verified} /> Checked by Resoha (admins only)</label>
            </div>
          )}
          <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
            <button className="btn" disabled={busy}>{d ? 'Save document' : 'Add document'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
