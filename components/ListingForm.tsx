'use client';
import { useEffect, useState } from 'react';
import NearbyEditor from './NearbyEditor';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import { AREA_CENTRES, NEIGHBORHOODS } from '@/lib/format';
import { DETAIL_FIELDS } from '@/lib/details';
import { EMPTY_LAND, LAND_FIELDS } from '@/lib/land';
import type { NearbyPlace } from '@/lib/nearby';
import { UNIT_STATUSES } from '@/lib/units';
import type { Listing } from '@/lib/types';

/** Одна форма і для створення, і для редагування — щоб поля не розходились. */
export default function ListingForm({
  listing, agencyName, asAdmin, owners, onSaved, onCancel,
}: {
  listing?: Listing | null;
  agencyName?: string | null;
  /** З адмінки форму відкриває не автор — підказка про власну агенцію тут ні до чого */
  asAdmin?: boolean;
  /** Ріелтори, на яких адмін може записати нове оголошення */
  owners?: { id: string; name: string; agency: string }[];
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [nearby, setNearby] = useState<NearbyPlace[]>(listing?.nearby ?? []);
  // ЖК автора — щоб квартиру можна було привʼязати до будинку
  const [developments, setDevelopments] = useState<{ id: string; name: string }[]>([]);
  const [developmentId, setDevelopmentId] = useState(listing?.developmentId ?? '');
  // доми обраного ЖК
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [buildingId, setBuildingId] = useState(listing?.buildingId ?? '');
  // тип керований: від нього залежить, чи показувати секцію «Land check»
  const [type, setType] = useState(listing?.type ?? 'condo');
  // угода керована: поле «Pets» має сенс лише для оренди
  const [deal, setDeal] = useState(listing?.deal ?? 'sale');
  // Пін за замовчуванням — центр обраного району: широту з довготою ріелтор напамʼять не знає
  const [area, setArea] = useState(listing?.neighborhood ?? 'West Bay');
  const [pin, setPin] = useState<[number, number]>(
    listing ? [listing.lat, listing.lng] : AREA_CENTRES['West Bay'],
  );

  function pickArea(next: string) {
    setArea(next);
    const centre = AREA_CENTRES[next];
    if (centre) setPin(centre);
  }

  // Райони беремо з бази, а не з константи: інакше форма не побачить нові
  const [areas, setAreas] = useState<string[]>(NEIGHBORHOODS);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(listing);

  useEffect(() => {
    fetch('/api/developments?mine=1')
      .then((r) => r.json())
      .then((d: { items?: { id: string; name: string }[] }) => setDevelopments(d.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!developmentId) return;
    fetch(`/api/developments/${developmentId}/buildings`)
      .then((r) => r.json())
      .then((d: { items?: { id: string; name: string }[] }) => setBuildings(d.items ?? []))
      .catch(() => {});
  }, [developmentId]);

  useEffect(() => {
    fetch('/api/facets')
      .then((r) => r.json())
      .then((d: { areas?: { name: string }[] }) => {
        const fromDb = (d.areas ?? []).map((a) => a.name);
        // об'єднуємо з довідником і поточним значенням, щоб нічого не загубити
        setAreas([...new Set([...fromDb, ...NEIGHBORHOODS, listing?.neighborhood].filter(Boolean) as string[])].sort());
      })
      .catch(() => {});
  }, [listing?.neighborhood]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    // паспорт ділянки збираємо окремо: поля land_* → обʼєкт land
    const land: Record<string, string> = {};
    for (const f of LAND_FIELDS) {
      const v = fd.get(`land_${f.key}`);
      if (typeof v === 'string') { land[f.key] = v; delete body[`land_${f.key}`]; }
    }
    // характеристики: поля detail_* і floorsTotal → обʼєкт details
    const details: Record<string, string> = {};
    for (const key of [...DETAIL_FIELDS.map((f) => f.key), 'floorsTotal']) {
      const name = key === 'floorsTotal' ? key : `detail_${key}`;
      const v = fd.get(name);
      if (typeof v === 'string' && v) details[key] = v;
      delete body[name];
    }
    // юніти без номера чи ціни — недописані; з юнітами ціна оголошення = найдешевший вільний
    setSaving(true);

    const res = await fetch(editing ? `/api/listings/${listing!.id}` : '/api/listings', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        land: type === 'land' ? land : undefined,
        // у землі цих характеристик немає
        details: type === 'land' ? {} : details,
        photos,
        // рядки без назви — недописані, їх не зберігаємо
        nearby: nearby.filter((p) => p.name.trim()),
        developmentId: developmentId || null,
        // дім має сенс лише разом зі своїм ЖК
        buildingId: developmentId ? buildingId || null : null,
        oceanfront: fd.get('oceanfront') === 'on',
        titled: fd.get('titled') === 'on',
        ownerFinancing: fd.get('ownerFinancing') === 'on',
        tags: String(body.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setSaving(false);

    if (!res.ok) return toast((await res.json()).error ?? 'Something went wrong');
    toast(editing ? 'Listing updated' : 'Listing published');
    if (!editing) { form.reset(); setPhotos([]); setNearby([]); }
    onSaved();
  }

  const v = listing;

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>{editing ? 'Edit listing' : 'New listing'}</h3>
      <p className="muted small" style={{ marginBottom: 18 }}>
        {asAdmin
          ? editing
            ? <>Editing as an admin — the listing stays with its own realtor and agency.</>
            : <>Adding as an admin — the listing is published under the realtor you pick, with their agency and contacts.</>
          : agencyName
            ? <>Published under <b>{agencyName}</b> — the agency name shows on the card and on the map.</>
            : <>Published under your own name. Join or open an agency in the <b>Agency</b> tab to list under a brand.</>}
      </p>

      <form className="form-grid" onSubmit={submit}>
        {asAdmin && !editing && (
          <div className="field full"><label>Listed by</label>
            <select className="input" name="agentId" required defaultValue={owners?.[0]?.id ?? ''}>
              {(owners ?? []).map((o) => (
                <option key={o.id} value={o.id}>{o.name}{o.agency ? ` — ${o.agency}` : ''}</option>
              ))}
            </select></div>
        )}
        <div className="field full"><label>Title</label>
          <input className="input" name="title" required defaultValue={v?.title}
            placeholder="2BR oceanfront condo at West Bay" /></div>

        <div className="field"><label>Listing type</label>
          <select className="input" name="deal" value={deal} onChange={(e) => setDeal(e.target.value as Listing['deal'])}>
            <option value="sale">For sale</option><option value="rent">For rent</option>
          </select></div>
        <div className="field"><label>Property type</label>
          <select className="input" name="type" value={type} onChange={(e) => setType(e.target.value as Listing['type'])}>
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
          <select className="input" name="neighborhood" value={area} onChange={(e) => pickArea(e.target.value)}>
            {areas.map((n) => <option key={n} value={n}>{n}</option>)}
          </select></div>
        <div className="field"><label>Address</label>
          <input className="input" name="address" defaultValue={v?.address} placeholder="West Bay Beach Rd" /></div>

        <div className="field"><label>Year built</label>
          <input className="input" name="year" type="number" defaultValue={v?.year || ''} placeholder="2019" /></div>
        <div className="field"><label>Latitude</label>
          <input className="input" name="lat" type="number" step="0.0001" value={pin[0]}
            onChange={(e) => setPin([Number(e.target.value), pin[1]])} /></div>
        <div className="field"><label>Longitude</label>
          <input className="input" name="lng" type="number" step="0.0001" value={pin[1]}
            onChange={(e) => setPin([pin[0], Number(e.target.value)])} /></div>
        <div className="field full">
          <span className="tiny muted">
            The pin starts in the middle of {area}. Fine-tune it if you know the exact spot —
            buyers use the map to judge the walk to the beach.
          </span>
        </div>

        <div className="field full switch-inline">
          <label><input type="checkbox" name="oceanfront" defaultChecked={v?.oceanfront} /> Oceanfront</label>
          {/* Титул — найчутливіше твердження в оголошенні, тому ставиться вручну, а не за замовчуванням */}
          <label><input type="checkbox" name="titled" defaultChecked={v?.titled ?? false} /> Free &amp; clear title</label>
          <label><input type="checkbox" name="ownerFinancing" defaultChecked={v?.ownerFinancing} /> Owner financing</label>
        </div>

        {/* Характеристики — таблиця на сторінці обʼєкта; порожнє поле там не показується */}
        {type !== 'land' && (
          <div className="field full land-form">
            <label>Details</label>
            <span className="tiny muted" style={{ marginBottom: 10 }}>
              These fill the details table on the listing page. Leave a field on “—” if you are not sure.
            </span>
            <div className="form-grid">
              <div className="field"><label>Floor</label>
                <input className="input" name="floor" type="number" defaultValue={v?.floor ?? ''} placeholder="3" /></div>
              <div className="field"><label>Floors in the building</label>
                <input className="input" name="floorsTotal" type="number" min={1} max={200}
                  defaultValue={v?.details.floorsTotal ?? ''} placeholder="8" /></div>
              {DETAIL_FIELDS.filter((f) => !f.rentOnly || deal === 'rent').map((f) => (
                <div key={f.key} className="field"><label>{f.label}</label>
                  <select className="input" name={`detail_${f.key}`} defaultValue={v?.details[f.key] ?? ''}>
                    <option value="">—</option>
                    {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select></div>
              ))}
            </div>
          </div>
        )}

        {/* Паспорт ділянки — лише для землі; у кондо й будинків цієї секції немає */}
        {type === 'land' && (
          <div className="field full land-form">
            <label>Land passport</label>
            <span className="tiny muted" style={{ marginBottom: 10 }}>
              What a buyer asks first. Leave a field on “Not confirmed” rather than guessing —
              title, road, electricity and water make up the “Ready to build” badge.
            </span>
            <div className="form-grid">
              {LAND_FIELDS.map((f) => (
                <div key={f.key} className="field"><label>{f.label}</label>
                  <select className="input" name={`land_${f.key}`} defaultValue={v?.land?.[f.key] ?? EMPTY_LAND[f.key]}>
                    {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select></div>
              ))}
            </div>
          </div>
        )}

        {/* Продане чи здане зникає з пошуку, але лишається на сторінці ЖК */}
        <div className="field"><label>Status</label>
          <select className="input" name="status" defaultValue={v?.status ?? 'available'}>
            {UNIT_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>

        {/* Квартира в ЖК: номер і поверх показуються на сторінці будинку */}
        {developments.length > 0 && (
          <>
            <div className="field"><label>Development</label>
              <select className="input" value={developmentId}
                onChange={(e) => { setDevelopmentId(e.target.value); setBuildings([]); setBuildingId(''); }}>
                <option value="">— Standalone property —</option>
                {developments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            {developmentId && (
              <>
                {buildings.length > 0 && (
                  <div className="field"><label>Building</label>
                    <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                      <option value="">—</option>
                      {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                )}
                <div className="field"><label>Unit number</label>
                  <input className="input" name="unitNo" maxLength={20} defaultValue={v?.unitNo} placeholder="303" /></div>
              </>
            )}
          </>
        )}

        <NearbyEditor value={nearby} onChange={setNearby} pin={pin} />

        <div className="field full"><label>Photos</label>
          <PhotoUploader value={photos} onChange={setPhotos} /></div>

        <div className="field full"><label>Tags (comma separated)</label>
          <input className="input" name="tags" defaultValue={v?.tags.join(', ')} placeholder="Pool, Turnkey, Rental income" /></div>

        <div className="field full"><label>Description</label>
          <textarea className="input" name="text" defaultValue={v?.text} placeholder="What makes this property worth the flight…" /></div>

        {/* Провенанс потрібен лише там, де оголошення завела платформа з чужого джерела */}
        {asAdmin && (
          <>
            <div className="field full"><label>Source — where these facts came from</label>
              <input className="input" name="sourceName" defaultValue={v?.sourceName} placeholder="Century 21 Roatan" /></div>
            <div className="field"><label>Reference</label>
              <input className="input" name="sourceRef" defaultValue={v?.sourceRef} placeholder="MLS 24-382" /></div>
            <div className="field"><label>Link to the original</label>
              <input className="input" name="sourceUrl" type="url" defaultValue={v?.sourceUrl} placeholder="https://…" /></div>
          </>
        )}

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
