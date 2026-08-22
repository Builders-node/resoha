'use client';
import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import RangeSlider from './RangeSlider';
import { AMENITIES, EMPTY_FILTERS, type Filters, toQuery } from '@/lib/filters';
import { fmtNumber } from '@/lib/format';

type Facets = {
  total: number;
  price: { min: number; max: number; histogram: number[] };
  sqft: { min: number; max: number };
  lot: { min: number; max: number };
  tags: { name: string; count: number }[];
  areas: { name: string; count: number }[];
  oceanfront: number; titled: number; ownerFinancing: number; noHoa: number;
};

const SORTS = [
  { v: '', label: 'Default' },
  { v: 'popular', label: 'Most viewed' },
  { v: 'new', label: 'Newest first' },
  { v: 'price_asc', label: 'Cheapest first' },
  { v: 'price_desc', label: 'Most expensive' },
  { v: 'sqft_desc', label: 'Largest' },
];
const TYPES = [
  { v: '', label: 'All' },
  { v: 'condo', label: 'Condos' },
  { v: 'house', label: 'Houses & villas' },
  { v: 'land', label: 'Land' },
  { v: 'commercial', label: 'Commercial' },
];
const HOA = [
  { v: '', label: 'Any' },
  { v: '0', label: 'No HOA' },
  { v: '300', label: 'under $300' },
  { v: '600', label: 'under $600' },
];
const YEARS = [
  { v: '', label: 'Any' },
  { v: '2020', label: '2020 and newer' },
  { v: '2010', label: '2010 and newer' },
  { v: '2000', label: '2000 and newer' },
];
const HNL_RATE = 26.2;

export default function FiltersModal({
  open, filters, onClose, onApply,
}: { open: boolean; filters: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const [draft, setDraft] = useState<Filters>(filters);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [cur, setCur] = useState<'USD' | 'HNL'>('USD');

  useEffect(() => { if (open) setDraft(filters); }, [open, filters]);

  /* межі та гістограма — з /api/facets під поточну угоду й тип */
  useEffect(() => {
    if (!open) return;
    const p = new URLSearchParams();
    if (draft.deal) p.set('deal', draft.deal);
    if (draft.type) p.set('type', draft.type);
    fetch(`/api/facets?${p}`).then((r) => r.json()).then(setFacets);
  }, [open, draft.deal, draft.type]);

  /* живий лічильник «Show N listings» */
  const qs = useMemo(() => toQuery(draft), [draft]);
  useEffect(() => {
    if (!open) return;
    let dead = false;
    const t = setTimeout(() => {
      fetch(`/api/listings?${qs}&countOnly=1`)
        .then((r) => r.json())
        .then((d) => { if (!dead) setCount(d.total); });
    }, 180);
    return () => { dead = true; clearTimeout(t); };
  }, [qs, open]);

  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const price = facets?.price ?? { min: 0, max: 0, histogram: [] };
  const priceStep = Math.max(500, Math.round((price.max - price.min) / 400 / 500) * 500);
  const lo = Number(draft.priceMin) || price.min;
  const hi = Number(draft.priceMax) || price.max;

  const sqft = facets?.sqft ?? { min: 0, max: 0 };
  const sqLo = Number(draft.sqftMin) || sqft.min;
  const sqHi = Number(draft.sqftMax) || sqft.max;

  const lot = facets?.lot ?? { min: 0, max: 0 };
  const lotLo = Number(draft.lotMin) || lot.min;
  const lotHi = Number(draft.lotMax) || lot.max;

  const showPrice = (v: number) =>
    cur === 'USD' ? `$${fmtNumber(Math.round(v))}` : `L ${fmtNumber(Math.round(v * HNL_RATE))}`;
  const parsePrice = (raw: string) => {
    const n = Number(raw.replace(/[^\d.]/g, ''));
    if (!n) return '';
    return String(Math.round(cur === 'USD' ? n : n / HNL_RATE));
  };

  return (
    <div className={`modal ${open ? 'is-open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box">
        <div className="modal__head">
          <h3>Filters</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>

        <div className="modal__body">
          {/* ——— Sorting ——— */}
          <section className="fsec">
            <div className="fsec__head"><span className="fsec__ico"><Icon name="sort" size={19} /></span><h4>Sorting</h4></div>
            <div className="chip-row">
              {SORTS.map((s) => (
                <button key={s.v} className={`chip-btn ${draft.sort === s.v ? 'is-on' : ''}`}
                  onClick={() => set({ sort: s.v })}>{s.label}</button>
              ))}
            </div>
          </section>

          {/* ——— Main ——— */}
          <section className="fsec">
            <div className="fsec__head"><span className="fsec__ico"><Icon name="sliders" size={19} /></span><h4>Main filters</h4></div>

            <div className="fgroup">
              <h5>Listing type</h5>
              <div className="chip-row">
                {[{ v: '', label: 'All' }, { v: 'sale', label: 'For sale' }, { v: 'rent', label: 'For rent' }].map((d) => (
                  <button key={d.v} className={`chip-btn ${draft.deal === d.v ? 'is-on' : ''}`}
                    onClick={() => set({ deal: d.v })}>{d.label}</button>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <h5>Property type</h5>
              <div className="chip-row">
                {TYPES.map((t) => (
                  <button key={t.v} className={`chip-btn ${draft.type === t.v ? 'is-on' : ''}`}
                    onClick={() => set({ type: t.v })}>{t.label}</button>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <div className="fgroup__head">
                <h5>Price</h5>
                <div className="cur-toggle">
                  <span style={{ color: cur === 'USD' ? 'var(--ink)' : undefined }}>USD</span>
                  <button className={`switch ${cur === 'HNL' ? 'is-on' : ''}`}
                    onClick={() => setCur(cur === 'USD' ? 'HNL' : 'USD')} aria-label="Currency" />
                  <span style={{ color: cur === 'HNL' ? 'var(--ink)' : undefined }}>HNL</span>
                </div>
              </div>
              <div className="range-inputs">
                <input className="input" value={showPrice(lo)}
                  onChange={(e) => set({ priceMin: parsePrice(e.target.value) })} />
                <span>—</span>
                <input className="input" value={`${showPrice(hi)}${hi >= price.max ? ' +' : ''}`}
                  onChange={(e) => set({ priceMax: parsePrice(e.target.value) })} />
              </div>
              <RangeSlider
                min={price.min} max={price.max} step={priceStep}
                value={[lo, hi]} histogram={price.histogram}
                onChange={([a, b]) => set({
                  priceMin: a <= price.min ? '' : String(a),
                  priceMax: b >= price.max ? '' : String(b),
                })}
              />
            </div>

            <div className="fgroup">
              <h5>Bedrooms</h5>
              <div className="chip-row">
                {['1', '2', '3', '4'].map((b) => (
                  <button key={b} className={`chip-btn ${draft.beds.includes(b) ? 'is-on' : ''}`}
                    onClick={() => set({ beds: toggleIn(draft.beds, b) })}>{b === '4' ? '4+' : b}</button>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <h5>Bathrooms</h5>
              <div className="chip-row">
                {['', '1', '2', '3'].map((b) => (
                  <button key={b || 'any'} className={`chip-btn ${draft.bathsMin === b ? 'is-on' : ''}`}
                    onClick={() => set({ bathsMin: b })}>{b ? `${b}+` : 'Any'}</button>
                ))}
              </div>
            </div>
          </section>

          {/* ——— Property ——— */}
          <section className="fsec">
            <div className="fsec__head"><span className="fsec__ico"><Icon name="home" size={19} /></span><h4>About the property</h4></div>

            {sqft.max > 0 && (
              <div className="fgroup">
                <h5>Interior size, ft²</h5>
                <div className="range-inputs">
                  <input className="input" value={`${fmtNumber(sqLo)} ft²`}
                    onChange={(e) => set({ sqftMin: e.target.value.replace(/\D/g, '') })} />
                  <span>—</span>
                  <input className="input" value={`${fmtNumber(sqHi)} ft²`}
                    onChange={(e) => set({ sqftMax: e.target.value.replace(/\D/g, '') })} />
                </div>
                <RangeSlider
                  min={sqft.min} max={sqft.max} step={10} value={[sqLo, sqHi]}
                  onChange={([a, b]) => set({
                    sqftMin: a <= sqft.min ? '' : String(a),
                    sqftMax: b >= sqft.max ? '' : String(b),
                  })}
                />
              </div>
            )}

            {lot.max > 0 && (
              <div className="fgroup">
                <h5>Lot size, acres</h5>
                <div className="range-inputs">
                  <input className="input" value={`${lotLo} ac`}
                    onChange={(e) => set({ lotMin: e.target.value.replace(/[^\d.]/g, '') })} />
                  <span>—</span>
                  <input className="input" value={`${lotHi} ac`}
                    onChange={(e) => set({ lotMax: e.target.value.replace(/[^\d.]/g, '') })} />
                </div>
                <RangeSlider
                  min={0} max={Math.ceil(lot.max)} step={0.05} value={[lotLo, lotHi]}
                  onChange={([a, b]) => set({
                    lotMin: a <= 0 ? '' : String(a),
                    lotMax: b >= Math.ceil(lot.max) ? '' : String(b),
                  })}
                />
              </div>
            )}

            <div className="fgroup">
              <h5>Must have</h5>
              <div className="switch-row">
                <span className="switch-row__label">Oceanfront <span className="muted small">({facets?.oceanfront ?? 0})</span></span>
                <button className={`switch ${draft.oceanfront ? 'is-on' : ''}`}
                  onClick={() => set({ oceanfront: !draft.oceanfront })} aria-label="Oceanfront" />
              </div>
              {AMENITIES.map((a) => {
                const c = facets?.tags.find((t) => t.name === a)?.count ?? 0;
                return (
                  <div className="switch-row" key={a}>
                    <span className="switch-row__label">{a} <span className="muted small">({c})</span></span>
                    <button className={`switch ${draft.tags.includes(a) ? 'is-on' : ''}`}
                      onClick={() => set({ tags: toggleIn(draft.tags, a) })} aria-label={a} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* ——— Title & fees ——— */}
          <section className="fsec">
            <div className="fsec__head"><span className="fsec__ico"><Icon name="deed" size={19} /></span><h4>Title &amp; fees</h4></div>

            <div className="fgroup">
              <div className="switch-row">
                <span className="switch-row__label">
                  Free &amp; clear title <span className="muted small">({facets?.titled ?? 0})</span>
                </span>
                <button className={`switch ${draft.titled ? 'is-on' : ''}`}
                  onClick={() => set({ titled: !draft.titled })} aria-label="Titled" />
              </div>
              <div className="switch-row">
                <span className="switch-row__label">
                  Owner financing <span className="muted small">({facets?.ownerFinancing ?? 0})</span>
                </span>
                <button className={`switch ${draft.ownerFinancing ? 'is-on' : ''}`}
                  onClick={() => set({ ownerFinancing: !draft.ownerFinancing })} aria-label="Owner financing" />
              </div>
            </div>

            <div className="fgroup">
              <h5>HOA fee</h5>
              <div className="chip-row">
                {HOA.map((h) => (
                  <button key={h.v || 'any'} className={`chip-btn ${draft.hoaMax === h.v ? 'is-on' : ''}`}
                    onClick={() => set({ hoaMax: h.v })}>{h.label}</button>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <h5>Year built</h5>
              <div className="chip-row">
                {YEARS.map((y) => (
                  <button key={y.v || 'any'} className={`chip-btn ${draft.yearMin === y.v ? 'is-on' : ''}`}
                    onClick={() => set({ yearMin: y.v })}>{y.label}</button>
                ))}
              </div>
            </div>
          </section>

          {/* ——— Areas ——— */}
          <section className="fsec">
            <div className="fsec__head"><span className="fsec__ico"><Icon name="pin" size={19} /></span><h4>Areas of Roatán</h4></div>
            <div className="chip-row">
              {(facets?.areas ?? []).map((a) => (
                <button key={a.name} className={`chip-btn ${draft.neighborhoods.includes(a.name) ? 'is-on' : ''}`}
                  onClick={() => set({ neighborhoods: toggleIn(draft.neighborhoods, a.name) })}>
                  {a.name} <span className="muted" style={{ marginLeft: 4 }}>{a.count}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="modal__foot">
          <button className="btn btn--ghost btn--lg" onClick={() => setDraft({ ...EMPTY_FILTERS, deal: draft.deal })}>
            Reset
          </button>
          <button className="btn btn--primary btn--lg" onClick={() => { onApply(draft); onClose(); }}>
            {count === null ? 'Show results' : `Show ${fmtNumber(count)} ${count === 1 ? 'listing' : 'listings'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
