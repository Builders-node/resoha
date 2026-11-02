'use client';
import { useCallback, useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import Icon from './Icon';
import { toast } from './Toaster';
import { PLACE_KINDS, kindIcon, kindLabel, parseLatLng, type MapPlace, type PlaceKind } from '@/lib/mapPlaces';

type Draft = { id: string | null; kind: PlaceKind; name: string; nameEs: string; note: string; lat: number; lng: number };
const EMPTY: Draft = { id: null, kind: 'beach', name: '', nameEs: '', note: '', lat: 16.32, lng: -86.53 };

/**
 * Admin → Map places: спільний шар місць (0070), який бачать усі на карті пошуку й на сторінці обʼєкта.
 * Точку ставлять кліком по карті або вставляють «lat, lng» з Google Maps. Видалення немає — «Hide».
 */
export default function MapPlacesAdmin() {
  const [places, setPlaces] = useState<MapPlace[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [paste, setPaste] = useState('');
  const [kind, setKind] = useState<'' | PlaceKind>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/map-places', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { places: [] }))
      .then((d) => setPlaces(d.places ?? []))
      .catch(() => setPlaces([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    const res = await fetch(draft.id ? `/api/admin/map-places/${draft.id}` : '/api/admin/map-places', {
      method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(d.error ?? 'Could not save');
    toast(draft.id ? 'Place saved' : 'Place added');
    setDraft(null);
    load();
  }

  async function toggle(p: MapPlace) {
    const res = await fetch(`/api/admin/map-places/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }),
    });
    if (!res.ok) return toast('Could not save');
    load();
  }

  const shown = (places ?? []).filter((p) => !kind || p.kind === kind);

  return (
    <div className="panel">
      <div className="fgroup__head">
        <h3>Map places</h3>
        <button className="btn btn--primary" onClick={() => { setDraft({ ...EMPTY }); setPaste(''); }}>
          <Icon name="plus" size={16} /> Add place
        </button>
      </div>
      <p className="small muted" style={{ margin: '0 0 14px' }}>
        Beaches, dive sites, schools, hospitals, ferries, airports and marinas. Buyers see them as a layer on every map
        and as “nearest beach, hospital…” on each listing page, so agents no longer add them listing by listing.
      </p>

      {draft && (
        <form className="form-grid mplaces__form" onSubmit={save}>
          <div className="field"><label>Type</label>
            <select className="input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as PlaceKind })}>
              {PLACE_KINDS.map(([k, label, ico]) => <option key={k} value={k}>{ico} {label}</option>)}
            </select></div>
          <div className="field"><label>Name</label>
            <input className="input" required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="West Bay Beach" /></div>
          <div className="field"><label>Name in Spanish (optional)</label>
            <input className="input" maxLength={120} value={draft.nameEs} onChange={(e) => setDraft({ ...draft, nameEs: e.target.value })}
              placeholder="Playa West Bay" /></div>
          <div className="field"><label>Note (optional)</label>
            <input className="input" maxLength={300} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Public access, snorkelling from shore" /></div>
          <div className="field full"><label>Point on the map</label>
            <LocationPicker key={draft.id ?? 'new'} value={[draft.lat, draft.lng]} onChange={([lat, lng]) => setDraft((d) => d && { ...d, lat, lng })} />
            <span style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 260 }} value={paste} onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste “16.3168, -86.523”" />
              <button type="button" className="btn btn--ghost" onClick={() => {
                const p = parseLatLng(paste);
                if (!p) return toast('Paste coordinates like 16.3168, -86.523');
                setDraft({ ...draft, lat: p[0], lng: p[1] });
              }}>Use</button>
              <span className="tiny muted" style={{ alignSelf: 'center' }}>{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</span>
            </span></div>
          <div className="full" style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="chip-row" style={{ margin: '16px 0 10px' }}>
        <button className={`chip-btn ${kind === '' ? 'is-on' : ''}`} onClick={() => setKind('')}>All</button>
        {PLACE_KINDS.map(([k, label, ico]) => (
          <button key={k} className={`chip-btn ${kind === k ? 'is-on' : ''}`} onClick={() => setKind(k)}>{ico} {label}</button>
        ))}
      </div>

      {places === null ? <p className="muted">Loading…</p> : shown.length === 0 ? (
        <p className="muted">No places yet. Add the first one, or run the starter list from the pull request in the SQL editor.</p>
      ) : (
        <ul className="mplaces">
          {shown.map((p) => (
            <li key={p.id} className={p.active ? '' : 'is-off'}>
              <span className="mplaces__ico" aria-hidden>{kindIcon(p.kind)}</span>
              <span className="mplaces__name">
                <b>{p.name}</b>
                <span className="tiny muted">{kindLabel(p.kind)} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}{p.active ? '' : ' · hidden'}</span>
              </span>
              <a className="btn btn--ghost btn--sm" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">Check</a>
              <button className="btn btn--ghost btn--sm" onClick={() => {
                setDraft({ id: p.id, kind: p.kind, name: p.name, nameEs: p.nameEs, note: p.note, lat: p.lat, lng: p.lng });
                setPaste('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>Edit</button>
              <button className="btn btn--ghost btn--sm" onClick={() => toggle(p)}>{p.active ? 'Hide' : 'Show'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
