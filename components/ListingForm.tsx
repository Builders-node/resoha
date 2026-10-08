'use client';
import { useEffect, useRef, useState } from 'react';
import AreaInput from './AreaInput';
import Icon from './Icon';
import LocationPicker from './LocationPicker';
import NearbyEditor from './NearbyEditor';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import { AREA_CENTRES, NEIGHBORHOODS } from '@/lib/format';
import { DETAIL_FIELDS } from '@/lib/details';
import { EMPTY_LAND, LAND_FIELDS } from '@/lib/land';
import type { NearbyPlace } from '@/lib/nearby';
import type { PhotoRooms } from '@/lib/rooms';
import { UNIT_STATUSES } from '@/lib/units';
import type { Listing } from '@/lib/types';

/** Кроки форми: одна тема на екран, щоб ріелтор не губився в сорока полях */
const STEPS = [
  { key: 'basics', title: 'Basics', hint: 'What you are listing and for how much.' },
  { key: 'location', title: 'Location', hint: 'Where it is. Buyers search by area and on the map.' },
  { key: 'details', title: 'Details', hint: 'Size, rooms and features. They fill the details table on the listing page.' },
  { key: 'photos', title: 'Photos', hint: 'Listings with 10+ photos get far more leads. Tag rooms so buyers can browse by room.' },
  { key: 'description', title: 'Description', hint: 'Tell the story and add what is nearby.' },
] as const;

const DEALS: { value: Listing['deal']; label: string; icon: string }[] = [
  { value: 'sale', label: 'For sale', icon: 'wallet' },
  { value: 'rent', label: 'For rent', icon: 'key' },
];

const TYPES: { value: Listing['type']; label: string; icon: string }[] = [
  { value: 'condo', label: 'Condo', icon: 'building' },
  { value: 'house', label: 'House / Villa', icon: 'home' },
  { value: 'land', label: 'Land', icon: 'land' },
  { value: 'commercial', label: 'Commercial', icon: 'briefcase' },
];

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
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  // кроки, які ріелтор уже пройшов — у степері вони з галочкою
  const [seen, setSeen] = useState<Set<number>>(() => new Set(listing ? STEPS.map((_, i) => i) : [0]));
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [photoRooms, setPhotoRooms] = useState<PhotoRooms>(listing?.photoRooms ?? {});
  const [nearby, setNearby] = useState<NearbyPlace[]>(listing?.nearby ?? []);
  // ЖК автора — щоб квартиру можна було привʼязати до будинку
  const [developments, setDevelopments] = useState<{ id: string; name: string; developer: string }[]>([]);
  const [developmentId, setDevelopmentId] = useState(listing?.developmentId ?? '');
  // доми обраного ЖК
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [buildingId, setBuildingId] = useState(listing?.buildingId ?? '');
  // план квартири для вкладки «Layouts»; спільний для однакових квартир ЖК
  const [floorplan, setFloorplan] = useState<string[]>(listing?.floorplan ? [listing.floorplan] : []);
  // тип керований: від нього залежить, які поля показувати на кроці «Details»
  const [type, setType] = useState<Listing['type']>(listing?.type ?? 'condo');
  // угода керована: поле «Pets» і підпис ціни залежать від оренди
  const [deal, setDeal] = useState<Listing['deal']>(listing?.deal ?? 'sale');
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
  const last = STEPS.length - 1;

  useEffect(() => {
    fetch('/api/developments?mine=1')
      .then((r) => r.json())
      .then((d: { items?: { id: string; name: string; developer: string }[] }) => setDevelopments(d.items ?? []))
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

  function goTo(next: number) {
    setStep(next);
    setSeen((s) => new Set(s).add(next));
    // новий крок починається згори форми, а не там, де лишився скрол
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Перше невалідне поле: перемикаємось на його крок і показуємо браузерну підказку */
  function reportInvalid(scope: ParentNode): boolean {
    const bad = scope.querySelector<HTMLInputElement>(':invalid:not(fieldset):not(form)');
    if (!bad) return true;
    const at = Number(bad.closest<HTMLElement>('[data-step]')?.dataset.step ?? step);
    if (at !== step) setStep(at);
    // поле на прихованому кроці стане видимим лише після рендеру
    setTimeout(() => { bad.reportValidity(); bad.focus(); }, 0);
    return false;
  }

  function next() {
    const section = formRef.current?.querySelector(`[data-step="${step}"]`);
    if (section && !reportInvalid(section)) return;
    goTo(Math.min(step + 1, last));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // Enter у полі нового оголошення — це «далі», а не «опублікувати» посеред форми
    if (!editing && step < last) return next();
    if (!reportInvalid(form)) return;
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
        // позначки лише для фото, що лишились у формі
        photoRooms: Object.fromEntries(Object.entries(photoRooms).filter(([url]) => photos.includes(url))),
        // рядки без назви — недописані, їх не зберігаємо
        nearby: nearby.filter((p) => p.name.trim()),
        developmentId: developmentId || null,
        // дім має сенс лише разом зі своїм ЖК
        buildingId: developmentId ? buildingId || null : null,
        floorplan: developmentId ? floorplan[0] ?? '' : '',
        oceanfront: fd.get('oceanfront') === 'on',
        titled: fd.get('titled') === 'on',
        ownerFinancing: fd.get('ownerFinancing') === 'on',
        tags: String(body.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setSaving(false);

    if (!res.ok) return toast((await res.json()).error ?? 'Something went wrong');
    toast(editing ? 'Listing updated' : 'Listing published');
    if (!editing) {
      form.reset(); setPhotos([]); setPhotoRooms({}); setNearby([]);
      setStep(0); setSeen(new Set([0]));
    }
    onSaved();
  }

  const v = listing;
  const isLand = type === 'land';
  // Поля, що не стосуються обраного типу, ховаємо, а не прибираємо з DOM:
  // так їхні значення не губляться, якщо ріелтор передумав щодо типу
  const hideIf = (cond: boolean) => (cond ? 'field is-hidden' : 'field');
  const show = (i: number) => (i === step ? undefined : true);

  return (
    <div className="panel lf">
      <div className="lf__head">
        <h3>{editing ? 'Edit listing' : 'New listing'}</h3>
        <p className="muted small">
          {asAdmin
            ? editing
              ? <>Editing as an admin — the listing stays with its own realtor and agency.</>
              : <>Adding as an admin — the listing is published under the realtor you pick, with their agency and contacts.</>
            : agencyName
              ? <>Published under <b>{agencyName}</b> — the agency name shows on the card and on the map.</>
              : <>Published under your own name. Join or open an agency in the <b>Agency</b> tab to list under a brand.</>}
        </p>
      </div>

      {/* Степер: кожен крок клікабельний — при редагуванні можна одразу стрибнути до фото */}
      <ol className="lf__steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button type="button" onClick={() => goTo(i)}
              className={`lf__step ${i === step ? 'is-on' : ''} ${seen.has(i) && i !== step ? 'is-done' : ''}`}
              aria-current={i === step ? 'step' : undefined}>
              <span className="lf__num">{seen.has(i) && i !== step ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="lf__label">
                {s.title}
                {s.key === 'photos' && photos.length > 0 && <span className="lf__count">{photos.length}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form ref={formRef} className="lf__form" onSubmit={submit} noValidate>
        <div className="lf__intro">
          <span className="lf__kicker">Step {step + 1} of {STEPS.length}</span>
          <h4>{STEPS[step].title}</h4>
          <p className="muted small">{STEPS[step].hint}</p>
        </div>

        {/* 1. Основне */}
        <section data-step={0} hidden={show(0)} className="lf__sec">
          {asAdmin && !editing && (
            <div className="field"><label>Listed by</label>
              <select className="input" name="agentId" required defaultValue={owners?.[0]?.id ?? ''}>
                {(owners ?? []).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}{o.agency ? ` — ${o.agency}` : ''}</option>
                ))}
              </select></div>
          )}

          <div className="field"><label>Listing type</label>
            <div className="lf__choice lf__choice--2" role="radiogroup" aria-label="Listing type">
              {DEALS.map((d) => (
                <button key={d.value} type="button" role="radio" aria-checked={deal === d.value}
                  className={`lf__opt ${deal === d.value ? 'is-on' : ''}`} onClick={() => setDeal(d.value)}>
                  <Icon name={d.icon} size={20} /> {d.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="deal" value={deal} /></div>

          <div className="field"><label>Property type</label>
            <div className="lf__choice" role="radiogroup" aria-label="Property type">
              {TYPES.map((t) => (
                <button key={t.value} type="button" role="radio" aria-checked={type === t.value}
                  className={`lf__opt ${type === t.value ? 'is-on' : ''}`} onClick={() => setType(t.value)}>
                  <Icon name={t.icon} size={20} /> {t.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="type" value={type} /></div>

          <div className="field"><label>Title</label>
            <input className="input" name="title" required defaultValue={v?.title}
              placeholder="2BR oceanfront condo at West Bay" />
            <span className="tiny muted">Shown on the card and in search. Rooms, type and place work best.</span></div>

          <div className="lf__row">
            <div className="field"><label>{deal === 'rent' ? 'Rent, USD per month' : 'Price, USD'}</label>
              <input className="input" name="price" type="number" min={0} required defaultValue={v?.price}
                placeholder={deal === 'rent' ? '1800' : '649000'} /></div>
            <div className={hideIf(isLand)}><label>HOA, USD/mo</label>
              <input className="input" name="hoa" type="number" min={0} defaultValue={v?.hoa ?? 0} /></div>
          </div>

          {/* Продане чи здане зникає з пошуку, але лишається на сторінці ЖК */}
          <div className="field"><label>Status</label>
            <select className="input" name="status" defaultValue={v?.status ?? 'available'}>
              {UNIT_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></div>
        </section>

        {/* 2. Де */}
        <section data-step={1} hidden={show(1)} className="lf__sec">
          <div className="lf__row">
            <div className="field"><label>Area</label>
              <select className="input" name="neighborhood" value={area} onChange={(e) => pickArea(e.target.value)}>
                {areas.map((n) => <option key={n} value={n}>{n}</option>)}
              </select></div>
            <div className="field"><label>Address</label>
              <input className="input" name="address" defaultValue={v?.address} placeholder="West Bay Beach Rd" /></div>
          </div>

          <div className="field"><label>Pin on the map</label>
            {/* карту монтуємо лише на її кроці: у прихованому блоці вона не знає свого розміру */}
            {step === 1 && (
              <LocationPicker value={pin} onChange={setPin}
                hint={`The pin starts in the middle of ${area}. Click the map or drag the pin to the exact spot.`} />
            )}
            <input type="hidden" name="lat" value={pin[0]} />
            <input type="hidden" name="lng" value={pin[1]} />
          </div>

          {/* Квартира в ЖК: номер і поверх показуються на сторінці будинку */}
          {developments.length > 0 && (
            <div className="lf__group">
              <div className="lf__group-head">
                <b>Part of a development?</b>
                <span className="tiny muted">Link the unit to its building so it shows on the development page.</span>
              </div>
              <div className="lf__row">
                <div className="field"><label>Development</label>
                  <select className="input" value={developmentId}
                    onChange={(e) => { setDevelopmentId(e.target.value); setBuildings([]); setBuildingId(''); }}>
                    <option value="">— Standalone property —</option>
                    {/* ЖК згруповані за забудовником — так легше знайти потрібний */}
                    {[...new Set(developments.map((d) => d.developer))].sort((a, b) => (a ? (b ? a.localeCompare(b) : -1) : 1)).map((by) => (
                      <optgroup key={by || '—'} label={by || 'Developer not specified'}>
                        {developments.filter((d) => d.developer === by).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {developmentId && (
                    <span className="tiny muted">
                      Developer: {developments.find((d) => d.id === developmentId)?.developer || 'not specified'}
                    </span>
                  )}</div>
                {developmentId && buildings.length > 0 && (
                  <div className="field"><label>Building</label>
                    <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                      <option value="">—</option>
                      {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                )}
                {developmentId && (
                  <div className="field"><label>Unit number</label>
                    <input className="input" name="unitNo" maxLength={20} defaultValue={v?.unitNo} placeholder="303" /></div>
                )}
              </div>
              {developmentId && (
                <div className="field"><label>Floor plan</label>
                  <PhotoUploader value={floorplan} onChange={setFloorplan} max={1} />
                  <span className="tiny muted">Shown on the development&apos;s Layouts page for every unit of the same type and size — one upload per layout is enough.</span></div>
              )}
            </div>
          )}
        </section>

        {/* 3. Характеристики */}
        <section data-step={2} hidden={show(2)} className="lf__sec">
          {/* одна сітка: сховані для цього типу поля просто випадають, без дірок */}
          <div className="lf__row lf__row--3">
            <div className={hideIf(isLand)}><label>Bedrooms</label>
              <input className="input" name="beds" type="number" min={0} defaultValue={v?.beds ?? 2} /></div>
            <div className={hideIf(isLand)}><label>Bathrooms</label>
              <input className="input" name="baths" type="number" min={0} step="0.5" defaultValue={v?.baths ?? 2} /></div>
            <div style={{ display: isLand ? 'none' : 'contents' }}>
              <AreaInput name="sqft" label="Interior" defaultSqft={v?.sqft} />
            </div>
            <div className={hideIf(type === 'condo')}><label>Lot, acres</label>
              <input className="input" name="lotAcres" type="number" min={0} step="0.01" defaultValue={v?.lotAcres ?? 0} /></div>
            <div className={hideIf(isLand)}><label>Year built</label>
              <input className="input" name="year" type="number" defaultValue={v?.year || ''} placeholder="2019" /></div>
            <div className={hideIf(isLand)}><label>Floor</label>
              <input className="input" name="floor" type="number" defaultValue={v?.floor ?? ''} placeholder="3" /></div>
            <div className={hideIf(isLand)}><label>Floors in the building</label>
              <input className="input" name="floorsTotal" type="number" min={1} max={200}
                defaultValue={v?.details.floorsTotal ?? ''} placeholder="8" /></div>
          </div>

          <div className="field"><label>Highlights</label>
            <div className="lf__checks">
              <label className="lf__check"><input type="checkbox" name="oceanfront" defaultChecked={v?.oceanfront} /> Oceanfront</label>
              {/* Титул — найчутливіше твердження в оголошенні, тому ставиться вручну, а не за замовчуванням */}
              <label className="lf__check"><input type="checkbox" name="titled" defaultChecked={v?.titled ?? false} /> Free &amp; clear title</label>
              <label className="lf__check"><input type="checkbox" name="ownerFinancing" defaultChecked={v?.ownerFinancing} /> Owner financing</label>
            </div></div>

          {/* Характеристики — таблиця на сторінці обʼєкта; порожнє поле там не показується */}
          <div className={`lf__group ${isLand ? 'is-hidden' : ''}`}>
            <div className="lf__group-head">
              <b>Features</b>
              <span className="tiny muted">Leave a field on “—” if you are not sure — empty ones are not shown.</span>
            </div>
            <div className="lf__row lf__row--3">
              {DETAIL_FIELDS.filter((f) => !f.rentOnly || deal === 'rent').map((f) => (
                <div key={f.key} className="field"><label>{f.label}</label>
                  <select className="input" name={`detail_${f.key}`} defaultValue={v?.details[f.key] ?? ''}>
                    <option value="">—</option>
                    {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select></div>
              ))}
            </div>
          </div>

          {/* Паспорт ділянки — лише для землі; у кондо й будинків цієї секції немає */}
          {isLand && (
            <div className="lf__group">
              <div className="lf__group-head">
                <b>Land passport</b>
                <span className="tiny muted">
                  What a buyer asks first. Leave a field on “Not confirmed” rather than guessing —
                  title, road, electricity and water make up the “Ready to build” badge.
                </span>
              </div>
              <div className="lf__row lf__row--3">
                {LAND_FIELDS.map((f) => (
                  <div key={f.key} className="field"><label>{f.label}</label>
                    <select className="input" name={`land_${f.key}`} defaultValue={v?.land?.[f.key] ?? EMPTY_LAND[f.key]}>
                      {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select></div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. Фото */}
        <section data-step={3} hidden={show(3)} className="lf__sec">
          <PhotoUploader value={photos} onChange={setPhotos} rooms={photoRooms} onRoomsChange={setPhotoRooms} />
        </section>

        {/* 5. Опис */}
        <section data-step={4} hidden={show(4)} className="lf__sec">
          <div className="field"><label>Description</label>
            <textarea className="input" name="text" rows={7} defaultValue={v?.text}
              placeholder="What makes this property worth the flight…" /></div>

          <div className="field"><label>Tags</label>
            <input className="input" name="tags" defaultValue={v?.tags.join(', ')} placeholder="Pool, Turnkey, Rental income" />
            <span className="tiny muted">Separate with commas.</span></div>

          {step === 4 && <NearbyEditor value={nearby} onChange={setNearby} pin={pin} />}

          {/* Провенанс потрібен лише там, де оголошення завела платформа з чужого джерела */}
          {asAdmin && (
            <div className="lf__group">
              <div className="lf__group-head"><b>Source</b>
                <span className="tiny muted">Where these facts came from.</span></div>
              <div className="field"><label>Source name</label>
                <input className="input" name="sourceName" defaultValue={v?.sourceName} placeholder="Century 21 Roatan" /></div>
              <div className="lf__row">
                <div className="field"><label>Reference</label>
                  <input className="input" name="sourceRef" defaultValue={v?.sourceRef} placeholder="MLS 24-382" /></div>
                <div className="field"><label>Link to the original</label>
                  <input className="input" name="sourceUrl" type="url" defaultValue={v?.sourceUrl} placeholder="https://…" /></div>
              </div>
            </div>
          )}
        </section>

        {/* Панель дій липне до низу: «Далі» і «Зберегти» завжди під рукою */}
        <div className="lf__bar">
          {step > 0
            ? <button type="button" className="btn btn--ghost btn--lg" onClick={() => goTo(step - 1)}>Back</button>
            : onCancel && <button type="button" className="btn btn--ghost btn--lg" onClick={onCancel}>Cancel</button>}
          <span className="lf__spacer" />
          {step < last && (
            <button type="button" className={`btn btn--lg ${editing ? 'btn--ghost' : 'btn--primary'}`} onClick={next}>
              Next: {STEPS[step + 1].title}
            </button>
          )}
          {(editing || step === last) && (
            <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
