'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang, useT } from './LangProvider';
import { EMBED_HEIGHT_MESSAGE, type EmbedView } from '@/lib/embed';
import { fmtNumber, fmtPrice, fmtPriceShort } from '@/lib/format';
import { statusLabel, toM2, type UnitStatus } from '@/lib/units';
import type { Deal } from '@/lib/types';

/** Квартира у віджеті: лише те, що показуємо, — без решти полів оголошення */
export interface EmbedUnit {
  id: string;
  unitNo: string;
  beds: number;
  floor: number | null;
  sqft: number;
  price: number;
  deal: Deal;
  status: UnitStatus;
  building: string;
}

const isOpen = (u: EmbedUnit) => u.status === 'available' || u.status === 'reserved';
const byNo = (a: EmbedUnit, b: EmbedUnit) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true });

/**
 * Інтерактивна частина віджета ЖК: шахматка або список, вибір квартири і форма заявки.
 * Висоту сторінки шле батьківському вікну — скрипт зі сніпета підганяє під неї рамку.
 */
export default function EmbedWidget({ units, view: initialView, canGrid, form, defaultUnitId, devName, pageUrl }: {
  units: EmbedUnit[];
  view: EmbedView;
  canGrid: boolean;
  form: boolean;
  /** квартира для загальної заявки «про ЖК» — лід завжди привʼязаний до обʼєкта */
  defaultUnitId: string;
  devName: string;
  pageUrl: string;
}) {
  const t = useT();
  const lang = useLang();
  const [view, setView] = useState<EmbedView>(initialView);
  const [hideSold, setHideSold] = useState(false);
  const [picked, setPicked] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  // сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  // висота для батьківської сторінки: при кожній зміні вмісту (перемикання, відправка, ресайз)
  useEffect(() => {
    if (window.parent === window) return;
    let last = 0;
    const post = () => {
      const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE, height }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const shown = hideSold ? units.filter(isOpen) : units;
  const pickedUnit = units.find((u) => u.id === picked);
  const kind = (beds: number) => (beds ? t('{n} bd', { n: beds }) : t('Studio'));

  // шахматка: блок на дім, поверхи згори донизу
  const blocks = useMemo(() => {
    const placed = shown.filter((u) => u.floor !== null);
    const names = [...new Set(placed.map((u) => u.building))];
    return names.map((name) => {
      const list = placed.filter((u) => u.building === name);
      const floors = [...new Set(list.map((u) => u.floor as number))].sort((a, b) => b - a);
      return { name, floors: floors.map((f) => ({ floor: f, units: list.filter((u) => u.floor === f).sort(byNo) })) };
    });
  }, [shown]);

  function pick(u: EmbedUnit) {
    if (!isOpen(u)) return;
    setPicked(u.id);
    setSent(false);
    // форма могла бути сховано після відправки — гортаємо після рендера
    if (form) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    else window.open(pageUrl, '_blank', 'noopener');
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const unitId = String(fd.get('unit') || '');
    const unit = units.find((u) => u.id === unitId);
    const about = unit
      ? t('Interested in unit {unit} ({kind}) at {dev}.', { unit: unit.unitNo || '—', kind: kind(unit.beds), dev: devName })
      : t('Interested in {what}.', { what: devName });
    setSending(true);
    setError('');
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: unit?.id || defaultUnitId,
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
        message: [about, String(fd.get('message') || '').trim()].filter(Boolean).join('\n'),
        website: fd.get('website'), ts: shownAt.current,
        // сайт, на якому стоїть віджет: у iframe referrer — адреса сторінки-господаря
        source: 'widget', site: document.referrer,
      }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) { setSent(true); return; }
    setError(t((await res?.json().catch(() => ({})))?.error ?? 'Something went wrong'));
  }

  const statuses = (['available', 'reserved', 'sold', 'rented'] as const).filter((s) => units.some((u) => u.status === s));

  return (
    <div className="embedw">
      {units.length > 0 && (
        <div className="embedw__bar">
          {canGrid && (
            <div className="embedw__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={view === 'grid'} className={view === 'grid' ? 'is-on' : ''}
                onClick={() => setView('grid')}>{t('By floor')}</button>
              <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'is-on' : ''}
                onClick={() => setView('list')}>{t('List')}</button>
            </div>
          )}
          <label className="embedw__check small">
            <input type="checkbox" checked={hideSold} onChange={(e) => setHideSold(e.target.checked)} /> {t('Only available')}
          </label>
        </div>
      )}

      {!units.length && <p className="muted">{t('Units and prices are coming soon.')}</p>}

      {view === 'grid' && units.length > 0 && (
        <div className="chess">
          <div className="chess__legend tiny">
            {statuses.map((s) => <span key={s}><i className={`chess__dot chess__dot--${s}`} /> {t(statusLabel(s))}</span>)}
          </div>
          {blocks.map((b) => (
            <div key={b.name} className="chess-group">
              {blocks.length > 1 && <h3 className="chess-group__title">{b.name || t('Other units')}</h3>}
              <div className="chess__grid">
                {b.floors.map((f) => (
                  <div key={f.floor} className="chess__floor">
                    <span className="chess__label tiny muted">{f.floor}</span>
                    <div className="chess__units">
                      {f.units.map((u) => (
                        <button key={u.id} type="button" disabled={!isOpen(u)} onClick={() => pick(u)}
                          className={`chess__cell chess__cell--${u.status} embedw__cell${picked === u.id ? ' is-picked' : ''}`}
                          title={`${u.unitNo} · ${kind(u.beds)}${u.sqft ? ` · ${toM2(u.sqft)} m² / ${fmtNumber(u.sqft)} ft²` : ''} · ${t(statusLabel(u.status))}`}>
                          <b>{u.unitNo || '—'}</b>
                          <span>{u.beds ? `${u.beds}BR` : 'ST'}</span>
                          <span>{isOpen(u) ? fmtPriceShort(u.price, u.deal, lang) : t(statusLabel(u.status))}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {form ? t('Floor on the left · tap an open unit to ask about it') : t('Floor on the left · tap an open unit for details')}
          </p>
        </div>
      )}

      {view === 'list' && units.length > 0 && (
        <div className="units__wrap">
          <table className="units__table embedw__table">
            <thead>
              <tr>
                <th>{t('Unit')}</th><th>{t('Type')}</th><th>{t('Floor')}</th><th>{t('Size')}</th>
                <th className="units__num">{t('Price')}</th><th aria-label={t('Enquire')} />
              </tr>
            </thead>
            <tbody>
              {[...shown].sort((a, b) => a.building.localeCompare(b.building) || byNo(a, b)).map((u) => (
                <tr key={u.id} className={isOpen(u) ? (picked === u.id ? 'is-picked' : undefined) : 'is-sold'}>
                  <td><b>{u.unitNo || '—'}</b>{u.building && <span className="tiny muted"> · {u.building}</span>}</td>
                  <td>{kind(u.beds)}</td>
                  <td>{u.floor ?? '—'}</td>
                  <td>{u.sqft > 0 ? <>{toM2(u.sqft)} m²<span className="muted"> · {fmtNumber(u.sqft)} ft²</span></> : '—'}</td>
                  <td className="units__num">
                    {u.status === 'available' ? <b>{fmtPrice(u.price, u.deal, lang)}</b>
                      : <span className="muted">{t(statusLabel(u.status))}</span>}
                  </td>
                  <td className="units__num">
                    {isOpen(u) && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => pick(u)}>
                        {form ? t('Enquire') : t('Details')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="embedw__form">
          {sent ? (
            <div className="small note-ok">
              {t('Thank you! Your enquiry has been sent — the sales team will contact you shortly.')}
            </div>
          ) : (
            <form ref={formRef} onSubmit={submit} className="embedw__grid">
              <div className="embedw__formhead full">
                <b>{t('Ask about prices & availability')}</b>
              </div>
              <select className="input full" name="unit" value={picked} onChange={(e) => setPicked(e.target.value)}
                aria-label={t('Unit')}>
                <option value="">{t('Any unit — general enquiry')}</option>
                {units.filter(isOpen).sort(byNo).map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.unitNo || '—'} · ${kind(u.beds)}${u.floor !== null ? ` · ${t('Floor')} ${u.floor}` : ''} · ${fmtPrice(u.price, u.deal, lang)}`}
                  </option>
                ))}
              </select>
              <input className="input" name="name" placeholder={t('Your name')} required maxLength={120} />
              <input className="input" name="phone" placeholder={t('Phone / WhatsApp')} required maxLength={40} />
              <input className="input full" name="email" type="email" placeholder={t('Email (optional)')} maxLength={200} />
              <textarea className="input full" name="message" rows={2} maxLength={1500}
                placeholder={t('Questions, timing, financing…')} />
              {/* приманка для ботів: людина цього поля не бачить і не заповнює */}
              <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <button className="btn btn--primary full" disabled={sending}>
                {sending ? t('Sending…') : pickedUnit
                  ? t('Ask about unit {unit}', { unit: pickedUnit.unitNo || '—' }) : t('Send enquiry')}
              </button>
              {error && <span className="small embedw__err full" role="alert">{error}</span>}
              <span className="tiny muted full">{t('By sending you agree to be contacted about this property.')}</span>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
