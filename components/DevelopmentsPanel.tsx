'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import VisitSettings from './VisitSettings';
import LocationPicker from './LocationPicker';
import Photo from './Photo';
import PhotoUploader from './PhotoUploader';
import PriceListImport from './PriceListImport';
import { toast } from './Toaster';
import { uploadPhotos } from '@/lib/uploadPhotos';
import { WEEKDAYS } from '@/lib/visits';
import { AREA_CENTRES, NEIGHBORHOODS } from '@/lib/format';
import { BUILDING_STAGES, DOC_KINDS, RENTAL_RULES, fmtDay, fmtMonth, SALES_STATUSES, salesLabel, stageLabel } from '@/lib/units';
import type { Building, Developer, Development, DevelopmentDocument, DevelopmentNews, Listing, ProgressEntry } from '@/lib/types';

/**
 * Вкладка «Developments» у кабінеті: список ЖК ріелтора, а кожен ЖК — своя сторінка
 * керування з розділами. Кожен розділ зберігається окремо, тож не треба гортати всі поля.
 */
export default function DevelopmentsPanel({ onUnitsAdded, isAdmin = false }: { onUnitsAdded: () => void; isAdmin?: boolean }) {
  const [items, setItems] = useState<Development[] | null>(null);
  const [open, setOpen] = useState<{ dev: Development; section: Section } | 'new' | null>(null);

  const load = useCallback(async () => {
    const d = await fetch('/api/developments?mine=1').then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (open === 'new') {
    return <NewDevelopment onCancel={() => setOpen(null)}
      onCreated={(d) => { load(); setOpen({ dev: d, section: 'units' }); }} />;
  }
  if (open) {
    return (
      <DevelopmentManager
        key={open.dev.id}
        initial={open.dev}
        section={open.section}
        onBack={() => { setOpen(null); load(); }}
        onDeleted={() => { setOpen(null); load(); }}
        onUnitsAdded={onUnitsAdded}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="panel">
      <div className="fgroup__head">
        <h3>My developments</h3>
        <button className="btn" onClick={() => setOpen('new')}>+ New development</button>
      </div>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        Each development has its own page. Open one to edit it section by section, add units or post news.
      </p>
      {items === null && <p className="muted">Loading…</p>}
      {items?.length === 0 && <p className="muted">No developments yet.</p>}
      <div className="dev-cards">
        {items?.map((d) => (
          <div key={d.id} className="dev-card">
            <button type="button" className="dev-card__main" onClick={() => setOpen({ dev: d, section: 'overview' })}>
              <Photo className="dev-card__img" src={d.photos[0]} label="" />
              <span>
                <b>{d.name}</b>
                <span className="small muted">
                  {[d.developer, d.neighborhood, salesLabel(d.sales), d.completion].filter(Boolean).join(' · ')}
                </span>
                {!d.active && <span className="pill pill--off" style={{ alignSelf: 'flex-start' }}>Hidden</span>}
              </span>
            </button>
            <div className="chip-row">
              <button className="btn btn--sm" onClick={() => setOpen({ dev: d, section: 'overview' })}>Manage</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen({ dev: d, section: 'news' })}>+ Post news</button>
              <Link className="btn btn--ghost btn--sm" href={`/developments/${d.slug}`} target="_blank">Open page</Link>
              <a className="btn btn--ghost btn--sm" href={`/developments/${d.slug}/booklet`} target="_blank" rel="noreferrer">Booklet PDF</a>
              <a className="btn btn--ghost btn--sm" href={`/developments/${d.slug}/price-list`} target="_blank" rel="noreferrer">Price list PDF</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Section = 'overview' | 'units' | 'details' | 'location' | 'media' | 'documents' | 'construction' | 'news';

const SECTIONS: [Section, string, string][] = [
  ['overview', 'Overview', 'home'],
  ['units', 'Buildings & units', 'building'],
  ['details', 'Features', 'list'],
  ['location', 'Location & contacts', 'pin'],
  ['media', 'Photos & video', 'camera'],
  ['documents', 'Documents', 'deed'],
  ['construction', 'Construction', 'crane'],
  ['news', 'News', 'bell'],
];

/** Забудовник зі списку профілів; «new» — завести новий профіль просто з форми */
function useDeveloperPicker(dev: Development | null) {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [developerId, setDeveloperId] = useState(dev?.developerId ?? '');
  const [newDeveloper, setNewDeveloper] = useState(!dev?.developerId && dev?.developer ? dev.developer : '');
  useEffect(() => {
    fetch('/api/developers').then((r) => r.json()).then((d) => {
      const list: Developer[] = d.items ?? [];
      setDevelopers(list);
      // старий ЖК із назвою текстом — підхоплюємо профіль з такою ж назвою
      if (!dev?.developerId && dev?.developer) {
        const same = list.find((x) => x.name.toLowerCase() === dev.developer.toLowerCase());
        if (same) { setDeveloperId(same.id); setNewDeveloper(''); } else setDeveloperId('new');
      }
    }).catch(() => {});
  }, [dev]);

  /** Поля для збереження; новий профіль створюється тут же. null — не вдалося. */
  async function resolve(): Promise<{ developerId: string | null; developer: string } | null> {
    if (developerId === 'new') {
      if (!newDeveloper.trim()) return { developerId: null, developer: '' };
      const r = await fetch('/api/developers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeveloper.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.error ?? 'Could not add the developer'); return null; }
      setDevelopers((list) => [...list, d.developer]);
      setDeveloperId(d.developer.id);
      setNewDeveloper('');
      return { developerId: d.developer.id, developer: d.developer.name };
    }
    return { developerId: developerId || null, developer: developers.find((x) => x.id === developerId)?.name ?? '' };
  }

  const field = (
    <div className="field"><label>Developer</label>
      <select className="input" value={developerId} onChange={(e) => setDeveloperId(e.target.value)}>
        <option value="">— Not specified —</option>
        {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        <option value="new">+ Add a new developer…</option>
      </select>
      {developerId === 'new' && (
        <input className="input" style={{ marginTop: 8 }} maxLength={120} autoFocus value={newDeveloper}
          onChange={(e) => setNewDeveloper(e.target.value)} placeholder="Company name" />
      )}
      {developerId && developerId !== 'new' && (
        <span className="tiny muted">
          <Link href={`/developers/${developers.find((d) => d.id === developerId)?.slug ?? ''}`} target="_blank">Open the company page</Link>
        </span>
      )}
    </div>
  );
  return { field, resolve };
}

/** Новий ЖК: лише те, без чого сторінки не буде. Решта — у розділах після створення. */
function NewDevelopment({ onCancel, onCreated }: { onCancel: () => void; onCreated: (d: Development) => void }) {
  const picker = useDeveloperPicker(null);
  const [area, setArea] = useState('West Bay');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const developer = await picker.resolve();
    if (!developer) return setSaving(false);
    const [lat, lng] = AREA_CENTRES[area] ?? AREA_CENTRES['West Bay'];
    const res = await fetch('/api/developments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), ...developer, neighborhood: area, lat, lng, active: true }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast('Development created — now add its buildings and units');
    onCreated(data.development);
  }

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>New development</h3>
      <p className="muted small" style={{ marginBottom: 14 }}>Start with the basics — photos, features, documents and news come next, each in its own section.</p>
      <form className="form-grid" onSubmit={submit}>
        <div className="field full"><label>Name</label>
          <input className="input" name="name" required maxLength={120} placeholder="Ocean View Residences" autoFocus /></div>
        {picker.field}
        <div className="field"><label>Area</label>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select></div>
        <div className="field"><label>Sales</label>
          <select className="input" name="sales" defaultValue="open">
            {SALES_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>
        <div className="field"><label>Completion</label>
          <input className="input" name="completion" maxLength={40} placeholder="Q4 2026" /></div>
        <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
          <button className="btn btn--primary" disabled={saving}>{saving ? 'Creating…' : 'Create development'}</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

/** Сторінка керування одним ЖК: шапка з цифрами, розділи зліва, один розділ за раз. */
function DevelopmentManager({ initial, section: start, onBack, onDeleted, onUnitsAdded, isAdmin }: {
  initial: Development;
  section: Section;
  onBack: () => void;
  onDeleted: () => void;
  onUnitsAdded: () => void;
  isAdmin: boolean;
}) {
  const [dev, setDev] = useState(initial);
  const [section, setSection] = useState<Section>(start);
  const [units, setUnits] = useState<Listing[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const loadUnits = useCallback(async () => {
    const d = await fetch(`/api/developments/${dev.id}`).then((r) => r.json()).catch(() => ({}));
    setUnits(d.units ?? []);
  }, [dev.id]);
  const loadBuildings = useCallback(async () => {
    const d = await fetch(`/api/developments/${dev.id}/buildings`).then((r) => r.json()).catch(() => ({}));
    setBuildings(d.items ?? []);
  }, [dev.id]);
  useEffect(() => { loadUnits(); loadBuildings(); }, [loadUnits, loadBuildings]);

  /** Зберегти частину полів ЖК — кожен розділ шле лише свої */
  async function patch(fields: Record<string, unknown>, done = 'Saved') {
    const res = await fetch(`/api/developments/${dev.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error ?? 'Could not save'); return false; }
    setDev(data.development);
    toast(done);
    return true;
  }

  async function remove() {
    if (!confirm(`Delete ${dev.name}? Its units stay as separate listings.`)) return;
    const res = await fetch(`/api/developments/${dev.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Not allowed');
    toast('Development deleted');
    onDeleted();
  }

  const live = units.filter((u) => u.active).length;
  const free = units.filter((u) => u.status === 'available').length;

  return (
    <div className="panel dev-mgr">
      <button type="button" className="link-btn small" onClick={onBack}>← All developments</button>
      <div className="dev-mgr__head">
        <Photo className="dev-card__img" src={dev.photos[0]} label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{dev.name}</h3>
          <div className="small muted">
            {[dev.developer, dev.neighborhood, salesLabel(dev.sales)].filter(Boolean).join(' · ')}
          </div>
          <div className="dev-mgr__stats small">
            <span><b>{units.length}</b> units</span>
            <span><b>{live}</b> live</span>
            <span><b>{free}</b> available</span>
            <span><b>{buildings.length}</b> {buildings.length === 1 ? 'building' : 'buildings'}</span>
          </div>
        </div>
        <div className="chip-row">
          <button type="button" className={`btn btn--sm ${dev.active ? 'btn--ghost' : 'btn--primary'}`}
            onClick={() => patch({ active: !dev.active }, dev.active ? 'Development hidden' : 'Development published')}>
            {dev.active ? 'Unpublish' : 'Publish'}
          </button>
          <Link className="btn btn--ghost btn--sm" href={`/developments/${dev.slug}`} target="_blank">Open page</Link>
        </div>
      </div>

      <div className="dev-mgr__body">
        <nav className="dev-mgr__nav" aria-label="Development sections">
          {SECTIONS.map(([k, label, icon]) => (
            <button key={k} type="button" className={section === k ? 'is-active' : ''} onClick={() => setSection(k)}>
              <Icon name={icon} size={17} /> {label}
            </button>
          ))}
        </nav>

        <div className="dev-mgr__pane">
          {section === 'overview' && <OverviewSection dev={dev} patch={patch} onDelete={remove} onGo={setSection} />}
          {section === 'units' && (
            <>
              <BuildingsEditor devId={dev.id} items={buildings} onChange={loadBuildings} />
              <PriceListImport dev={dev} buildings={buildings} onAdded={() => { loadUnits(); onUnitsAdded(); }} />
            </>
          )}
          {section === 'details' && <FeaturesSection dev={dev} patch={patch} />}
          {section === 'location' && (
            <>
              <LocationSection dev={dev} patch={patch} />
              <VisitSettings dev={dev} onSaved={(visitCapacity, blackoutDates) => setDev({ ...dev, visitCapacity, blackoutDates })} />
            </>
          )}
          {section === 'media' && <MediaSection dev={dev} patch={patch} />}
          {section === 'documents' && <DocumentsEditor devId={dev.id} isAdmin={isAdmin} />}
          {section === 'construction' && <ProgressEditor devId={dev.id} buildings={buildings} />}
          {section === 'news' && <NewsEditor devId={dev.id} />}
        </div>
      </div>
    </div>
  );
}

type Patch = (fields: Record<string, unknown>, done?: string) => Promise<boolean>;

/** Форма одного розділу: збирає свої поля й зберігає лише їх */
function SectionForm({ title, hint, onSave, children }: {
  title: string;
  hint?: string;
  onSave: (fd: FormData) => Promise<unknown>;
  children: React.ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <form className="form-grid" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      await onSave(new FormData(e.currentTarget));
      setSaving(false);
    }}>
      <div className="field full">
        <h4 style={{ margin: 0 }}>{title}</h4>
        {hint && <span className="tiny muted">{hint}</span>}
      </div>
      {children}
      <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

const entries = (fd: FormData) => Object.fromEntries(fd.entries());

function OverviewSection({ dev, patch, onDelete, onGo }: {
  dev: Development; patch: Patch; onDelete: () => void; onGo: (s: Section) => void;
}) {
  const picker = useDeveloperPicker(dev);
  // що ще не заповнено — підказки з переходом у потрібний розділ
  const todo: [Section, string][] = ([
    [!dev.photos.length, 'media', 'Add photos'],
    [!dev.text, 'overview', 'Write a description'],
    [!dev.amenities.length && !dev.construction, 'details', 'Fill in the building features'],
    [!dev.address && !dev.office, 'location', 'Add the address or sales office'],
  ] as [boolean, Section, string][]).filter(([missing]) => missing).map(([, s, label]) => [s, label]);

  return (
    <>
      {todo.length > 0 && (
        <div className="dev-mgr__todo">
          <b className="small">To finish the page</b>
          <div className="chip-row">
            {todo.map(([s, label]) => (
              <button key={label} type="button" className="chip-btn" onClick={() => onGo(s)}>{label}</button>
            ))}
          </div>
        </div>
      )}
      <SectionForm title="Overview" hint="Name, developer and the description at the top of the page."
        onSave={async (fd) => {
          const developer = await picker.resolve();
          if (developer) await patch({ ...entries(fd), ...developer });
        }}>
        <div className="field full"><label>Name</label>
          <input className="input" name="name" required maxLength={120} defaultValue={dev.name} /></div>
        {picker.field}
        <div className="field"><label>Sales</label>
          <select className="input" name="sales" defaultValue={dev.sales}>
            {SALES_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>
        <div className="field"><label>Completion</label>
          <input className="input" name="completion" maxLength={40} defaultValue={dev.completion} placeholder="Q4 2026" /></div>
        <div className="field full"><label>Description</label>
          <textarea className="input" name="text" rows={7} maxLength={8000} defaultValue={dev.text}
            placeholder="What makes this project special: location, views, finishes, who it suits…" /></div>
      </SectionForm>
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn--danger btn--sm" onClick={onDelete}><Icon name="trash" size={16} /> Delete development</button>
      </div>
    </>
  );
}

function FeaturesSection({ dev, patch }: { dev: Development; patch: Patch }) {
  const text = (name: keyof Development, label: string, placeholder = '', max = 120) => (
    <div className="field"><label>{label}</label>
      <input className="input" name={name} maxLength={max} defaultValue={String(dev[name] ?? '')} placeholder={placeholder} /></div>
  );
  return (
    <SectionForm title="Features" hint="Shown in the features grid on the page and on every unit. Empty fields are hidden."
      onSave={(fd) => patch(entries(fd))}>
      <div className="field"><label>Floors</label>
        <input className="input" name="floors" type="number" min={1} max={200} defaultValue={dev.floors ?? ''} /></div>
      {text('projectClass', 'Class', 'Luxury', 60)}
      {text('construction', 'Construction', 'Reinforced concrete')}
      {text('walls', 'Walls', 'Concrete block')}
      {text('insulation', 'Insulation')}
      {text('climate', 'Cooling & heating', 'Split A/C in every room')}
      {text('ceiling', 'Ceiling height', '2.8 m', 60)}
      {text('finish', 'Finish', 'Turnkey, furnished')}
      {text('territory', 'Grounds', 'Gated, 24/7 security')}
      {text('backupPower', 'Backup power', 'Generator for common areas')}
      {text('water', 'Water supply', 'Cistern + municipal')}
      {text('parking', 'Parking', 'Covered, 1 space per unit')}
      <div className="field"><label>HOA, $ per month</label>
        <input className="input" name="hoa" type="number" min={0} defaultValue={dev.hoa ?? ''} placeholder="Leave empty if unknown" /></div>
      <div className="field"><label>Rentals</label>
        <select className="input" name="rentals" defaultValue={dev.rentals ?? ''}>
          {RENTAL_RULES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select></div>
      <div className="field full"><label>Amenities</label>
        <input className="input" name="amenities" maxLength={600} defaultValue={dev.amenities.join(', ')}
          placeholder="Pool, gym, rooftop terrace, 24/7 security" />
        <span className="tiny muted">Comma-separated.</span></div>
      <div className="field full"><label>Payment plan</label>
        <textarea className="input" name="payment" rows={4} maxLength={2000} defaultValue={dev.payment}
          placeholder={'10% reservation deposit\n40% on signing\n50% on delivery'} />
        <span className="tiny muted">One step per line.</span></div>
    </SectionForm>
  );
}

/** Рядок графіка в редакторі: вихідний день теж тримає години, щоб галочка повертала їх назад */
type DayRow = { on: boolean; open: string; close: string };
const TYPICAL_WEEK: DayRow[] = WEEKDAYS.map((_, i) => ({ on: i < 6, open: '09:00', close: i < 5 ? '17:00' : '13:00' }));

function LocationSection({ dev, patch }: { dev: Development; patch: Patch }) {
  const [area, setArea] = useState(dev.neighborhood);
  const [pin, setPin] = useState<[number, number]>([dev.lat, dev.lng]);
  const [week, setWeek] = useState<DayRow[]>(() => WEEKDAYS.map((_, i) => {
    const d = dev.schedule[i];
    return d ? { on: true, ...d } : { on: false, open: '09:00', close: '17:00' };
  }));
  const setDay = (i: number, v: Partial<DayRow>) => setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...v } : d)));
  return (
    <SectionForm title="Location & contacts" hint="Where the project is and where buyers visit the sales office."
      onSave={async (fd) => {
        // інакше база мовчки зробила б такий день вихідним
        const bad = week.findIndex((d) => d.on && d.close <= d.open);
        if (bad >= 0) return toast(`${WEEKDAYS[bad]}: closing time must be after opening time`);
        return patch({
          ...entries(fd), neighborhood: area, lat: pin[0], lng: pin[1],
          schedule: week.map((d) => (d.on ? { open: d.open, close: d.close } : null)),
        });
      }}>
      <div className="field"><label>Area</label>
        <select className="input" value={area} onChange={(e) => {
          setArea(e.target.value);
          if (AREA_CENTRES[e.target.value]) setPin(AREA_CENTRES[e.target.value]);
        }}>
          {[...new Set([...NEIGHBORHOODS, area])].map((n) => <option key={n} value={n}>{n}</option>)}
        </select></div>
      <div className="field"><label>Address</label>
        <input className="input" name="address" maxLength={120} defaultValue={dev.address} /></div>
      <div className="field full"><label>Location on the map</label>
        <LocationPicker value={pin} onChange={setPin} /></div>
      <div className="field"><label>Sales office</label>
        <input className="input" name="office" maxLength={160} defaultValue={dev.office} placeholder="Leave empty if on site" /></div>
      <div className="field full"><label>Sales office hours</label>
        <div className="sched">
          {week.map((d, i) => (
            <div key={WEEKDAYS[i]} className={`sched__row${d.on ? '' : ' is-off'}`}>
              <label className="sched__day">
                <input type="checkbox" checked={d.on} onChange={(e) => setDay(i, { on: e.target.checked })} /> {WEEKDAYS[i]}
              </label>
              {d.on ? (
                <span className="sched__time">
                  <input className="input" type="time" step={1800} value={d.open} required
                    onChange={(e) => setDay(i, { open: e.target.value })} aria-label={`${WEEKDAYS[i]} opens`} />
                  –
                  <input className="input" type="time" step={1800} value={d.close} required
                    onChange={(e) => setDay(i, { close: e.target.value })} aria-label={`${WEEKDAYS[i]} closes`} />
                </span>
              ) : <span className="small muted">Closed</span>}
            </div>
          ))}
        </div>
        <span className="tiny muted">
          Buyers book a visit in 30-minute slots inside these hours (Roatán time).
          Leave every day unticked to turn booking off.{' '}
          <button type="button" className="linkbtn" onClick={() => setWeek(TYPICAL_WEEK)}>Fill Mon–Fri 9–17, Sat 9–13</button>
        </span></div>
      <div className="field"><label>Hours note</label>
        <input className="input" name="hours" maxLength={200} defaultValue={dev.hours} placeholder="Closed on public holidays" /></div>
      <div className="field"><label>Project website</label>
        <input className="input" name="website" maxLength={200} defaultValue={dev.website} placeholder="example.com" /></div>
    </SectionForm>
  );
}

function MediaSection({ dev, patch }: { dev: Development; patch: Patch }) {
  const [photos, setPhotos] = useState<string[]>(dev.photos);
  return (
    <SectionForm title="Photos & video" hint="The first photo is the cover on cards and at the top of the page."
      onSave={(fd) => patch({ ...entries(fd), photos })}>
      <div className="field full"><label>Photos</label>
        <PhotoUploader value={photos} onChange={setPhotos} max={30} watermark /></div>
      <div className="field"><label>Video link</label>
        <input className="input" name="video" maxLength={500} defaultValue={dev.video} placeholder="https://youtube.com/watch?v=…" />
        <span className="tiny muted">YouTube or Vimeo — plays right on the page.</span></div>
      <div className="field"><label>360° tour or drone flyover</label>
        <input className="input" name="tour" maxLength={500} defaultValue={dev.tour} placeholder="https://my.matterport.com/show/?m=…" />
        <span className="tiny muted">Matterport, Kuula or a YouTube 360 video.</span></div>
    </SectionForm>
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
    <div className="units-form" style={{ marginTop: 24 }}>
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
                <button type="button" className="btn btn--ghost btn--sm btn--icon" title="Edit" aria-label="Edit" onClick={() => open(x)}><Icon name="pencil" size={16} /></button>
                <button type="button" className="btn btn--danger btn--sm btn--icon" title="Delete" aria-label="Delete" onClick={() => remove(x)}><Icon name="trash" size={16} /></button>
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
    <div className="units-form" style={{ marginTop: 24 }}>
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
                <button type="button" className="btn btn--ghost btn--sm btn--icon" title="Edit" aria-label="Edit" onClick={() => open(x)}><Icon name="pencil" size={16} /></button>
                <button type="button" className="btn btn--danger btn--sm btn--icon" title="Delete" aria-label="Delete" onClick={() => remove(x)}><Icon name="trash" size={16} /></button>
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
              {file && <button type="button" className="btn btn--danger btn--sm btn--icon" title="Remove file" aria-label="Remove file" onClick={() => setFile('')}><Icon name="trash" size={16} /></button>}
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

/** Хід будівництва: фото за місяць, для всього ЖК або окремого дому */
function ProgressEditor({ devId, buildings }: { devId: string; buildings: Building[] }) {
  const [items, setItems] = useState<ProgressEntry[]>([]);
  const [editing, setEditing] = useState<ProgressEntry | 'new' | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch(`/api/developments/${devId}/progress`).then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, [devId]);
  useEffect(() => { load(); }, [load]);

  function open(e: ProgressEntry | 'new') {
    setEditing(e);
    setPhotos(e !== 'new' ? e.photos : []);
  }

  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!editing) return;
    if (!photos.length) return toast('Add at least one photo');
    const fd = new FormData(ev.currentTarget);
    setBusy(true);
    const res = await fetch(editing === 'new' ? `/api/developments/${devId}/progress` : `/api/progress/${editing.id}`, {
      method: editing === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), photos }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(editing === 'new' ? 'Update added' : 'Update saved');
    setEditing(null);
    load();
  }

  async function remove(e: ProgressEntry) {
    if (!confirm(`Delete the ${fmtMonth(e.month)} update?`)) return;
    const res = await fetch(`/api/progress/${e.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Could not delete');
    load();
  }

  const e = editing === 'new' ? null : editing;
  const bname = (id: string | null) => buildings.find((b) => b.id === id)?.name;
  return (
    <div className="units-form" style={{ marginTop: 24 }}>
      <div className="fgroup__head">
        <label><b>Construction progress</b></label>
        {!editing && <button type="button" className="btn btn--ghost btn--sm" onClick={() => open('new')}>+ Add month</button>}
      </div>
      <span className="tiny muted">Site photos for a month — they appear on the Construction tab, newest first.</span>
      {!editing && (
        <div className="dev-list">
          {!items.length && <p className="muted small">No updates yet.</p>}
          {items.map((x) => (
            <div key={x.id} className="dev-list__row">
              <div>
                <b>{fmtMonth(x.month)}</b>
                <div className="small muted">{[bname(x.buildingId), `${x.photos.length} photos`].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="chip-row">
                <button type="button" className="btn btn--ghost btn--sm btn--icon" title="Edit" aria-label="Edit" onClick={() => open(x)}><Icon name="pencil" size={16} /></button>
                <button type="button" className="btn btn--danger btn--sm btn--icon" title="Delete" aria-label="Delete" onClick={() => remove(x)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <form className="form-grid" onSubmit={save} key={e?.id ?? 'new'}>
          <div className="field"><label>Month</label>
            <input className="input" name="month" type="month" required defaultValue={e?.month.slice(0, 7) ?? new Date().toISOString().slice(0, 7)} /></div>
          {buildings.length > 0 && (
            <div className="field"><label>Building</label>
              <select className="input" name="buildingId" defaultValue={e?.buildingId ?? ''}>
                <option value="">Whole development</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
          )}
          <div className="field full"><label>Note</label>
            <input className="input" name="note" maxLength={500} defaultValue={e?.note} placeholder="Frame up to floor 6, windows going in" /></div>
          <div className="field full"><label>Photos</label>
            <PhotoUploader value={photos} onChange={setPhotos} max={40} watermark /></div>
          <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
            <button className="btn" disabled={busy}>{e ? 'Save update' : 'Add update'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Новини ЖК: старт продажів, зміна цін, етапи будівництва */
function NewsEditor({ devId }: { devId: string }) {
  const [items, setItems] = useState<DevelopmentNews[]>([]);
  const [editing, setEditing] = useState<DevelopmentNews | 'new' | null>(null);
  const [photo, setPhoto] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch(`/api/developments/${devId}/news`).then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, [devId]);
  useEffect(() => { load(); }, [load]);

  function open(n: DevelopmentNews | 'new') {
    setEditing(n);
    setPhoto(n !== 'new' && n.photo ? [n.photo] : []);
  }

  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    setBusy(true);
    const res = await fetch(!editing || editing === 'new' ? `/api/developments/${devId}/news` : `/api/news/${editing.id}`, {
      method: !editing || editing === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), photo: photo[0] ?? '' }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? 'Something went wrong');
    toast(!editing || editing === 'new' ? 'News published' : 'News updated');
    setEditing('new');
    setPhoto([]);
    load();
  }

  async function remove(n: DevelopmentNews) {
    if (!confirm(`Delete “${n.title}”?`)) return;
    const res = await fetch(`/api/news/${n.id}`, { method: 'DELETE' });
    if (!res.ok) return toast('Could not delete');
    load();
  }

  // нова новина пишеться одразу зверху — без зайвого кліку «Add news»
  const n = editing && editing !== 'new' ? editing : null;
  return (
    <div className="units-form">
      <div className="fgroup__head">
        <label><b>{n ? 'Edit news' : 'Post news'}</b></label>
      </div>
      <span className="tiny muted">Sales launches, price changes, construction milestones — shown on the News tab.</span>
      <form className="form-grid news-compose" onSubmit={save} key={n?.id ?? `new-${items.length}`}>
        <div className="field full">
          <input className="input" name="title" required maxLength={160} defaultValue={n?.title} placeholder="Headline, e.g. Second release: 12 new units on floors 7–9" /></div>
        <div className="field full">
          <textarea className="input" name="body" rows={4} maxLength={4000} defaultValue={n?.body} placeholder="What happened and what it means for buyers…" /></div>
        <div className="field"><label>Date</label>
          <input className="input" name="publishedOn" type="date" required defaultValue={n?.publishedOn ?? new Date().toISOString().slice(0, 10)} /></div>
        <div className="field full"><label>Photo</label>
          <PhotoUploader value={photo} onChange={setPhoto} max={1} /></div>
        <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
          <button className="btn btn--primary" disabled={busy}>{n ? 'Save news' : 'Publish'}</button>
          {n && <button type="button" className="btn btn--ghost" onClick={() => open('new')}>Cancel</button>}
        </div>
      </form>
      {!n && (
        <div className="dev-list" style={{ marginTop: 20 }}>
          <label><b>Published</b></label>
          {!items.length && <p className="muted small">No news yet.</p>}
          {items.map((x) => (
            <div key={x.id} className="dev-list__row">
              <div>
                <b>{x.title}</b>
                <div className="small muted">{fmtDay(x.publishedOn)}</div>
              </div>
              <div className="chip-row">
                <button type="button" className="btn btn--ghost btn--sm btn--icon" title="Edit" aria-label="Edit" onClick={() => open(x)}><Icon name="pencil" size={16} /></button>
                <button type="button" className="btn btn--danger btn--sm btn--icon" title="Delete" aria-label="Delete" onClick={() => remove(x)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
