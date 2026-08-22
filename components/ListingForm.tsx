'use client';
import { useState } from 'react';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import { NEIGHBORHOODS } from '@/lib/format';
import type { Listing } from '@/lib/types';

/** Одна форма і для створення, і для редагування — щоб поля не розходились. */
export default function ListingForm({
  listing, agencyName, onSaved, onCancel,
}: {
  listing?: Listing | null;
  agencyName?: string | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(listing);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    setSaving(true);

    const res = await fetch(editing ? `/api/listings/${listing!.id}` : '/api/listings', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        photos,
        oceanfront: fd.get('oceanfront') === 'on',
        titled: fd.get('titled') === 'on',
        ownerFinancing: fd.get('ownerFinancing') === 'on',
        tags: String(body.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setSaving(false);

    if (!res.ok) return toast((await res.json()).error ?? 'Something went wrong');
    toast(editing ? 'Listing updated' : 'Listing published');
    if (!editing) { form.reset(); setPhotos([]); }
    onSaved();
  }

  const v = listing;

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>{editing ? 'Edit listing' : 'New listing'}</h3>
      <p className="muted small" style={{ marginBottom: 18 }}>
        {agencyName
          ? <>Published under <b>{agencyName}</b> — the agency name shows on the card and on the map.</>
          : <>Published under your own name. Join or open an agency in the <b>Agency</b> tab to list under a brand.</>}
      </p>

      <form className="form-grid" onSubmit={submit}>
        <div className="field full"><label>Title</label>
          <input className="input" name="title" required defaultValue={v?.title}
            placeholder="2BR oceanfront condo at West Bay" /></div>

        <div className="field"><label>Listing type</label>
          <select className="input" name="deal" defaultValue={v?.deal ?? 'sale'}>
            <option value="sale">For sale</option><option value="rent">For rent</option>
          </select></div>
        <div className="field"><label>Property type</label>
          <select className="input" name="type" defaultValue={v?.type ?? 'condo'}>
            <option value="condo">Condo</option><option value="house">House / Villa</option>
            <option value="land">Land</option><option value="commercial">Commercial</option>
          </select></div>

        <div className="field"><label>Price, USD</label>
          <input className="input" name="price" type="number" required defaultValue={v?.price} placeholder="649000" /></div>
        <div className="field"><label>HOA, USD/mo</label>
          <input className="input" name="hoa" type="number" defaultValue={v?.hoa ?? 0} /></div>

        <div className="field"><label>Bedrooms</label>
          <input className="input" name="beds" type="number" defaultValue={v?.beds ?? 2} /></div>
        <div className="field"><label>Bathrooms</label>
          <input className="input" name="baths" type="number" step="0.5" defaultValue={v?.baths ?? 2} /></div>

        <div className="field"><label>Interior, ft²</label>
          <input className="input" name="sqft" type="number" defaultValue={v?.sqft} placeholder="1240" /></div>
        <div className="field"><label>Lot, acres</label>
          <input className="input" name="lotAcres" type="number" step="0.01" defaultValue={v?.lotAcres ?? 0} /></div>

        <div className="field"><label>Area</label>
          <select className="input" name="neighborhood" defaultValue={v?.neighborhood ?? 'West Bay'}>
            {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select></div>
        <div className="field"><label>Address</label>
          <input className="input" name="address" defaultValue={v?.address} placeholder="West Bay Beach Rd" /></div>

        <div className="field"><label>Year built</label>
          <input className="input" name="year" type="number" defaultValue={v?.year || ''} placeholder="2019" /></div>
        <div className="field"><label>Latitude</label>
          <input className="input" name="lat" type="number" step="0.0001" defaultValue={v?.lat ?? 16.29} /></div>
        <div className="field"><label>Longitude</label>
          <input className="input" name="lng" type="number" step="0.0001" defaultValue={v?.lng ?? -86.594} /></div>

        <div className="field full switch-inline">
          <label><input type="checkbox" name="oceanfront" defaultChecked={v?.oceanfront} /> Oceanfront</label>
          <label><input type="checkbox" name="titled" defaultChecked={v?.titled ?? true} /> Free &amp; clear title</label>
          <label><input type="checkbox" name="ownerFinancing" defaultChecked={v?.ownerFinancing} /> Owner financing</label>
        </div>

        <div className="field full"><label>Photos</label>
          <PhotoUploader value={photos} onChange={setPhotos} /></div>

        <div className="field full"><label>Tags (comma separated)</label>
          <input className="input" name="tags" defaultValue={v?.tags.join(', ')} placeholder="Pool, Turnkey, Rental income" /></div>

        <div className="field full"><label>Description</label>
          <textarea className="input" name="text" defaultValue={v?.text} placeholder="What makes this property worth the flight…" /></div>

        <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn--primary btn--lg" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
          </button>
          {onCancel && <button type="button" className="btn btn--ghost btn--lg" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
