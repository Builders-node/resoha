'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { COUNTRIES, ENTRY_POINTS, MARITAL_LABELS } from '@/lib/residency/options';
import type { DocKind, Gender, Marital } from '@/lib/residency/fill';

type Client = {
  name: string; surname: string; gender: Gender; marital: Marital; passport: string; address: string;
  countryEs: string; countryEn: string; natEsF: string; natEsM: string; natEn: string; entryEs: string; entryEn: string;
};
type Attorney = {
  name: string; gender: Gender; marital: Marital; bar: string; idNumber: string; city: string; phone: string; email: string;
};

const us = COUNTRIES[0];
const rtb = ENTRY_POINTS[0];
const EMPTY_CLIENT: Client = {
  name: '', surname: '', gender: 'm', marital: 'single', passport: '', address: '',
  countryEs: us.es, countryEn: us.en, natEsF: us.esF, natEsM: us.esM, natEn: us.enAdj, entryEs: rtb.es, entryEn: rtb.en,
};
const EMPTY_ATTORNEY: Attorney = { name: '', gender: 'm', marital: 'single', bar: '', idNumber: '', city: '', phone: '', email: '' };

/** Дані адвоката однакові для всіх клієнтів — памʼятаємо їх у браузері адміна, а не в базі. */
const ATTORNEY_KEY = 'hogarli.residency.attorney';
const today = () => new Date().toLocaleDateString('en-CA');

/**
 * Admin → Residency docs: доверенність (Carta Poder) і листи до Migración за шаблонами юристів.
 * Вводиш дані клієнта — отримуєш .docx з тим самим оформленням, готовий до друку й підпису.
 */
export default function ResidencyDocsAdmin() {
  const [client, setClient] = useState<Client>(EMPTY_CLIENT);
  const [attorney, setAttorney] = useState<Attorney>(EMPTY_ATTORNEY);
  const [country, setCountry] = useState(us.code);
  const [entry, setEntry] = useState(rtb.id);
  const [letterCity, setLetterCity] = useState('Roatán');
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState<DocKind | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ATTORNEY_KEY);
      if (saved) setAttorney({ ...EMPTY_ATTORNEY, ...JSON.parse(saved) });
    } catch { /* приватне вікно — просто порожні поля */ }
  }, []);

  const c = (k: keyof Client) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setClient({ ...client, [k]: e.target.value });
  const a = (k: keyof Attorney) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAttorney({ ...attorney, [k]: e.target.value });

  function pickCountry(code: string) {
    setCountry(code);
    const k = COUNTRIES.find((x) => x.code === code);
    setClient(k
      ? { ...client, countryEs: k.es, countryEn: k.en, natEsF: k.esF, natEsM: k.esM, natEn: k.enAdj }
      : { ...client, countryEs: '', countryEn: '', natEsF: '', natEsM: '', natEn: '' });
  }

  function pickEntry(id: string) {
    setEntry(id);
    const p = ENTRY_POINTS.find((x) => x.id === id);
    setClient({ ...client, entryEs: p?.es ?? '', entryEn: p?.en ?? '' });
  }

  async function download(doc: DocKind) {
    setBusy(doc);
    try { localStorage.setItem(ATTORNEY_KEY, JSON.stringify(attorney)); } catch { /* не критично */ }
    const res = await fetch('/api/admin/residency-docs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, client, attorney, letterCity, date }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error ?? 'Could not build the document');
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${doc}.docx`;
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  const genderSelect = (value: Gender, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void) => (
    <select className="input" value={value} onChange={onChange}>
      <option value="m">Male (el Sr. / he)</option>
      <option value="f">Female (la Sra. / she)</option>
    </select>
  );
  const maritalSelect = (value: Marital, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void) => (
    <select className="input" value={value} onChange={onChange}>
      {MARITAL_LABELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );

  return (
    <div className="rdocs">
      <div className="panel">
        <div className="fgroup__head"><h3>Residency documents</h3></div>
        <p className="small muted" style={{ margin: '0 0 14px' }}>
          Fills the lawyers’ templates for a Honduran residency application: the power of attorney (Carta Poder) and
          the two letters for the Instituto Nacional de Migración (extension of stay and letter of responsibility).
          Both files are bilingual, Spanish and English. Nothing you type here is saved on the server; the attorney’s
          details are remembered in this browser only.
        </p>

        <h4 className="rdocs__h">Client</h4>
        <div className="form-grid">
          <div className="field"><label>Full name, as in the passport</label>
            <input className="input" value={client.name} onChange={c('name')} placeholder="John Michael Smith" /></div>
          <div className="field"><label>Surname</label>
            <input className="input" value={client.surname} onChange={c('surname')} placeholder="Smith" /></div>
          <div className="field"><label>Gender</label>{genderSelect(client.gender, c('gender'))}</div>
          <div className="field"><label>Marital status</label>{maritalSelect(client.marital, c('marital'))}</div>
          <div className="field"><label>Passport number</label>
            <input className="input" value={client.passport} onChange={c('passport')} /></div>
          <div className="field"><label>Passport country</label>
            <select className="input" value={country} onChange={(e) => pickCountry(e.target.value)}>
              {COUNTRIES.map((k) => <option key={k.code} value={k.code}>{k.en}</option>)}
              <option value="other">Other — type below</option>
            </select></div>
          <div className="field full"><label>Home address abroad</label>
            <input className="input" value={client.address} onChange={c('address')}
              placeholder="123 Main Street, Austin, Texas 78701, United States" /></div>
        </div>

        <details className="rdocs__more" open={country === 'other'}>
          <summary className="small">How the country is written in the documents</summary>
          <div className="form-grid">
            <div className="field"><label>Country, Spanish</label>
              <input className="input" value={client.countryEs} onChange={c('countryEs')} placeholder="Estados Unidos" /></div>
            <div className="field"><label>Country, English</label>
              <input className="input" value={client.countryEn} onChange={c('countryEn')} placeholder="United States" /></div>
            <div className="field"><label>“con nacionalidad …”</label>
              <input className="input" value={client.natEsF} onChange={c('natEsF')} placeholder="estadounidense" /></div>
            <div className="field"><label>“Pasaporte … número”</label>
              <input className="input" value={client.natEsM} onChange={c('natEsM')} placeholder="estadounidense" /></div>
            <div className="field"><label>“… passport number”</label>
              <input className="input" value={client.natEn} onChange={c('natEn')} placeholder="American" /></div>
          </div>
        </details>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field"><label>Entered Honduras through</label>
            <select className="input" value={entry} onChange={(e) => pickEntry(e.target.value)}>
              {ENTRY_POINTS.map((p) => <option key={p.id} value={p.id}>{p.en}</option>)}
              <option value="other">Other — type below</option>
            </select></div>
          <div className="field" />
          {entry === 'other' && (
            <>
              <div className="field"><label>Point of entry, Spanish</label>
                <input className="input" value={client.entryEs} onChange={c('entryEs')} placeholder="Frontera de Corinto, Omoa" /></div>
              <div className="field"><label>Point of entry, English</label>
                <input className="input" value={client.entryEn} onChange={c('entryEn')} placeholder="Corinto border crossing, Omoa" /></div>
            </>
          )}
        </div>

        <h4 className="rdocs__h">Attorney receiving the power of attorney</h4>
        <div className="form-grid">
          <div className="field"><label>Full name</label>
            <input className="input" value={attorney.name} onChange={a('name')} /></div>
          <div className="field"><label>Gender</label>{genderSelect(attorney.gender, a('gender'))}</div>
          <div className="field"><label>Marital status</label>{maritalSelect(attorney.marital, a('marital'))}</div>
          <div className="field"><label>Bar number (Colegio de Abogados)</label>
            <input className="input" value={attorney.bar} onChange={a('bar')} /></div>
          <div className="field"><label>Honduran ID number</label>
            <input className="input" value={attorney.idNumber} onChange={a('idNumber')} placeholder="0801-1990-12345" /></div>
          <div className="field"><label>City of residence</label>
            <input className="input" value={attorney.city} onChange={a('city')} placeholder="Tegucigalpa" /></div>
          <div className="field"><label>Phone</label>
            <input className="input" type="tel" value={attorney.phone} onChange={a('phone')} placeholder="+504 9999-9999" /></div>
          <div className="field"><label>E-mail</label>
            <input className="input" type="email" value={attorney.email} onChange={a('email')} /></div>
        </div>

        <h4 className="rdocs__h">Date and place</h4>
        <div className="form-grid">
          <div className="field"><label>Date on the documents</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label>City on the Migración letters</label>
            <input className="input" value={letterCity} onChange={(e) => setLetterCity(e.target.value)} /></div>
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          The power of attorney keeps the lawyers’ place of signing, Tegucigalpa, M.D.C.
        </p>

        <div className="rdocs__actions">
          <button className="btn btn--primary" disabled={busy !== null} onClick={() => download('poa')}>
            <Icon name="download" size={18} /> {busy === 'poa' ? 'Preparing…' : 'Power of attorney (.docx)'}
          </button>
          <button className="btn btn--primary" disabled={busy !== null} onClick={() => download('letters')}>
            <Icon name="download" size={18} /> {busy === 'letters' ? 'Preparing…' : 'Migración letters (.docx)'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="fgroup__head"><h3>Before the client signs</h3></div>
        <ul className="small rdocs__list">
          <li>Read both files once in Word: names and passport numbers must match the passport exactly.</li>
          <li>The client also needs a medical certificate from a physician (in Próspera, Dr. Osman).</li>
          <li>Request the extension before the 120 days of the tourist stay run out. Migración charges $20 per extra month.</li>
          <li>No special letter is needed for the bank: the client says they are applying for residency and shows these documents.</li>
        </ul>
      </div>
    </div>
  );
}
