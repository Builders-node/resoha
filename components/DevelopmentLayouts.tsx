'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AgentContact from './AgentContact';
import FavButton from './FavButton';
import Icon from './Icon';
import Photo from './Photo';
import RangeSlider from './RangeSlider';
import { useT } from './LangProvider';
import { fmtNumber, fmtUsd, SQFT_PER_M2 } from '@/lib/format';
import { OPEN_STATUSES, stageLabel, statusLabel, toM2 } from '@/lib/units';
import { SITE_URL } from '@/lib/site';
import type { Agent, Building, Development, Listing } from '@/lib/types';
import type { T } from '@/lib/i18n';
import { useLp } from './useLp';

/** Особливості для чипів фільтра: показуємо лише ті, що є хоч в одному плануванні */
const FEATURES: [key: string, label: string, test: (u: Listing) => boolean][] = [
  ['balcony', 'Balcony', (u) => u.details.outdoor === 'balcony' || u.details.outdoor === 'terrace'],
  ['ocean', 'Ocean view', (u) => u.oceanfront || u.details.view === 'ocean' || u.details.view === 'partial'],
  ['baths', '2+ bathrooms', (u) => u.baths >= 2],
  ['furnished', 'Furnished', (u) => u.details.furnished === 'furnished' || u.details.furnished === 'partly'],
  ['financing', 'Owner financing', (u) => u.ownerFinancing],
];
const ROOMS = [0, 1, 2, 3, 4] as const;

const isOpen = (u: Listing) => OPEN_STATUSES.includes(u.status);
const m2 = (u: Listing) => (u.sqft ? toM2(u.sqft) : 0);
const ppm = (u: Listing) => (u.sqft ? Math.round((u.price / u.sqft) * SQFT_PER_M2) : 0);

/** Одне планування: квартири одного типу (з документації забудовника) або однієї кімнатності й площі */
type Layout = {
  key: string;
  beds: number;
  type: string;
  units: Listing[];
  open: Listing[];
  lead: Listing;
  plan: string;
  area: [number, number];
  floors: number[];
  buildingIds: string[];
  features: string[];
};

function buildLayouts(units: Listing[]): Layout[] {
  const groups = new Map<string, Listing[]>();
  for (const u of units) {
    const key = `${u.beds}-${u.details.layout || (Math.round(m2(u) * 2) / 2)}`;
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  return [...groups.entries()].map(([key, g]) => {
    const open = g.filter(isOpen);
    const lead = [...(open.length ? open : g)].sort((a, b) => a.price - b.price)[0];
    const areas = g.map(m2).filter(Boolean);
    return {
      key, beds: lead.beds, type: g.find((u) => u.details.layout)?.details.layout ?? '',
      units: [...g].sort((a, b) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true })),
      open, lead,
      plan: lead.floorplan || g.find((u) => u.floorplan)?.floorplan || '',
      area: [Math.min(...areas, Infinity), Math.max(...areas, 0)] as [number, number],
      floors: [...new Set(g.flatMap((u) => (u.floor !== null ? [u.floor] : [])))].sort((a, b) => a - b),
      buildingIds: [...new Set(g.flatMap((u) => (u.buildingId ? [u.buildingId] : [])))],
      features: FEATURES.filter(([, , test]) => g.some(test)).map(([k]) => k),
    };
  }).sort((a, b) => a.beds - b.beds || a.area[0] - b.area[0]);
}

/** «2–5, 7» */
function floorRanges(fl: number[]) {
  const out: string[] = [];
  for (let i = 0; i < fl.length; i++) {
    let j = i;
    while (j + 1 < fl.length && fl[j + 1] === fl[j] + 1) j++;
    out.push(j > i + 1 ? `${fl[i]}–${fl[j]}` : j === i + 1 ? `${fl[i]}, ${fl[j]}` : `${fl[i]}`);
    i = j;
  }
  return out.join(', ');
}
const span = (a: number, b: number, f: (v: number) => string = String) => (a === b ? f(a) : `${f(a)}–${f(b)}`);
const kind = (t: T, beds: number) => (beds ? t(beds === 1 ? '1 bedroom' : '{n} bedrooms', { n: beds }) : t('Studio'));
const ppmLine = (l: Layout) => {
  const list = (l.open.length ? l.open : l.units).filter((u) => u.deal === 'sale').map(ppm).filter(Boolean);
  return list.length ? span(Math.min(...list), Math.max(...list), fmtUsd) : '';
};

type Props = {
  units: Listing[];
  buildings: Building[];
  dev: Pick<Development, 'name' | 'slug' | 'completion' | 'payment'>;
  agent: Agent;
  me: { name: string; phone: string; email: string } | null;
  favIds: string[];
  levelPlans: Record<number, string>;
  visitHref?: string;
};

/**
 * «Планування», як на LUN: фільтри (дім, площа, поверх, кімнатність, особливості), сітка карток
 * з планом і ціною за m², а по кліку — вікно з великим планом, характеристиками, планом поверху,
 * умовами оплати, контактом і схожими плануваннями. Відкрите планування — у ?layout=, щоб ним можна було поділитись.
 */
export default function DevelopmentLayouts({ units, buildings, dev, agent, me, favIds, levelPlans, visitHref }: Props) {
  const t = useT();
  // LUN показує продаж; оренду лишаємо, лише якщо продажу в ЖК немає взагалі
  const pool = useMemo(() => (units.some((u) => u.deal === 'sale') ? units.filter((u) => u.deal === 'sale') : units), [units]);
  const layouts = useMemo(() => buildLayouts(pool), [pool]);

  const areaMin = Math.floor(Math.min(...pool.map(m2).filter(Boolean), Infinity));
  const areaMax = Math.ceil(Math.max(...pool.map(m2), 0));
  const allFloors = pool.flatMap((u) => (u.floor !== null ? [u.floor] : []));
  const floorMin = Math.min(...allFloors, Infinity);
  const floorMax = Math.max(...allFloors, -Infinity);

  const [blds, setBlds] = useState<string[]>([]);
  const [area, setArea] = useState<[number, number]>([areaMin, areaMax]);
  const [floor, setFloor] = useState<[number, number]>([floorMin, floorMax]);
  const [rooms, setRooms] = useState<number[]>([]);
  const [feats, setFeats] = useState<string[]>([]);
  const [bldOpen, setBldOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pushed = useRef(false);

  const unitOk = useCallback((u: Listing, withBld = true) => {
    const a = m2(u);
    if (withBld && blds.length && !blds.includes(u.buildingId ?? '')) return false;
    if (a && (a < area[0] - 0.05 || a > area[1] + 0.05)) return false;
    if (u.floor !== null && Number.isFinite(floorMin) && (u.floor < floor[0] || u.floor > floor[1])) return false;
    return true;
  }, [blds, area, floor, floorMin]);
  const layoutOk = useCallback((l: Layout) =>
    (!rooms.length || rooms.includes(Math.min(l.beds, 4))) && feats.every((f) => l.features.includes(f)), [rooms, feats]);

  const shown = layouts.filter((l) => layoutOk(l) && l.units.some((u) => unitOk(u)));
  const dirty = blds.length > 0 || rooms.length > 0 || feats.length > 0
    || area[0] !== areaMin || area[1] !== areaMax || floor[0] !== floorMin || floor[1] !== floorMax;
  const clear = () => { setBlds([]); setRooms([]); setFeats([]); setArea([areaMin, areaMax]); setFloor([floorMin, floorMax]); };

  // ?layout=… — відкрите планування; «Назад» у браузері його закриває
  useEffect(() => {
    const sync = () => setOpenKey(new URLSearchParams(location.search).get('layout'));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const open = (key: string) => {
    const url = new URL(location.href);
    url.searchParams.set('layout', key);
    if (openKey) history.replaceState(null, '', url);
    else { history.pushState(null, '', url); pushed.current = true; }
    setOpenKey(key);
  };
  const close = () => {
    if (pushed.current) { pushed.current = false; history.back(); return; }
    const url = new URL(location.href);
    url.searchParams.delete('layout');
    history.replaceState(null, '', url);
    setOpenKey(null);
  };
  const current = layouts.find((l) => l.key === openKey) ?? null;

  const bname = (id: string) => buildings.find((b) => b.id === id)?.name ?? '';
  // дім і термін здачі — як «Будинок, Термін введення» на LUN: доми згруповані за терміном
  const byCompletion = useMemo(() => {
    const m = new Map<string, Building[]>();
    for (const b of buildings.filter((b) => pool.some((u) => u.buildingId === b.id))) {
      const k = b.completion || dev.completion || stageLabel(b.stage);
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m.entries()];
  }, [buildings, pool, dev.completion]);
  const bldCount = layouts.filter((l) => layoutOk(l) && l.units.some((u) => unitOk(u, false) && (!blds.length || blds.includes(u.buildingId ?? '')))).length;

  const groups = ROOMS.map((r) => [r, shown.filter((l) => Math.min(l.beds, 4) === r)] as const).filter(([, g]) => g.length);

  return (
    <div className="lay">
      <div className="lay__filters">
        <div className="lay__ranges">
          {byCompletion.length > 0 && buildings.length > 1 && (
            <div className="lay__field lay__field--bld">
              <span className="lay__label">{t('Building, completion')}</span>
              <button type="button" className="lay__select" onClick={() => setBldOpen((v) => !v)} aria-expanded={bldOpen}>
                {blds.length ? blds.map(bname).join(', ') : t('All')}
                <Icon name="chevron" size={16} />
              </button>
              {bldOpen && (
                <div className="lay__pop">
                  {byCompletion.map(([when, list]) => (
                    <div key={when} className="lay__popgroup">
                      <label className="lay__check is-head">
                        <input type="checkbox" checked={list.every((b) => blds.includes(b.id))}
                          onChange={(e) => setBlds((s) => e.target.checked
                            ? [...new Set([...s, ...list.map((b) => b.id)])] : s.filter((id) => !list.some((b) => b.id === id)))} />
                        {when}
                      </label>
                      <div className="lay__popgrid">
                        {list.map((b) => (
                          <label key={b.id} className="lay__check">
                            <input type="checkbox" checked={blds.includes(b.id)}
                              onChange={(e) => setBlds((s) => (e.target.checked ? [...s, b.id] : s.filter((id) => id !== b.id)))} />
                            {b.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="lay__popfoot">
                    <button type="button" className="btn btn--ghost" onClick={() => setBlds([])}>{t('Clear')}</button>
                    <button type="button" className="btn btn--primary" onClick={() => setBldOpen(false)}>
                      {t(bldCount === 1 ? '{n} layout' : '{n} layouts', { n: bldCount })}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {areaMax > areaMin && (
            <div className="lay__field">
              <span className="lay__label">{t('Area, m²')}</span>
              <b className="lay__value">{fmtNumber(area[0])} — {fmtNumber(area[1])}</b>
              <RangeSlider min={areaMin} max={areaMax} step={0.5} value={area} onChange={setArea} />
            </div>
          )}
          {floorMax > floorMin && (
            <div className="lay__field">
              <span className="lay__label">{t('Floor')}</span>
              <b className="lay__value">{floor[0]} — {floor[1]}</b>
              <RangeSlider min={floorMin} max={floorMax} value={floor} onChange={setFloor} />
            </div>
          )}
        </div>

        <div className="lay__chips">
          <div>
            <span className="lay__label">{t('Rooms')}</span>
            <div className="chip-row">
              {ROOMS.map((r) => {
                const has = layouts.some((l) => Math.min(l.beds, 4) === r);
                const on = rooms.includes(r);
                return (
                  <button key={r} type="button" disabled={!has} aria-pressed={on}
                    className={`lay__chip${on ? ' is-on' : ''}`}
                    onClick={() => setRooms((s) => (on ? s.filter((x) => x !== r) : [...s, r]))}>
                    {r === 0 ? t('Studio') : r === 4 ? '4+' : r}
                  </button>
                );
              })}
            </div>
          </div>
          {FEATURES.some(([k]) => layouts.some((l) => l.features.includes(k))) && (
            <div>
              <span className="lay__label">{t('Features')}</span>
              <div className="chip-row">
                {FEATURES.filter(([k]) => layouts.some((l) => l.features.includes(k))).map(([k, label]) => {
                  const on = feats.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on} className={`lay__chip${on ? ' is-on' : ''}`}
                      onClick={() => setFeats((s) => (on ? s.filter((x) => x !== k) : [...s, k]))}>{t(label)}</button>
                  );
                })}
              </div>
            </div>
          )}
          {dirty && (
            <button type="button" className="lay__clear" onClick={clear}>{t('Clear')} <Icon name="close" size={16} /></button>
          )}
        </div>
      </div>

      {groups.map(([r, list]) => {
        const prices = list.flatMap((l) => l.open).filter((u) => u.deal === 'sale' && unitOk(u)).map((u) => u.price);
        return (
          <section key={r} className="lay__group">
            <h2 className="lay__kind">
              {r === 0 ? t('Studios') : r === 4 ? t('4+ bedroom apartments') : t('{n}-bedroom apartments', { n: r })}
              {prices.length > 0 && <> {t('from {price}', { price: fmtUsd(Math.min(...prices)) })}</>}
            </h2>
            <div className="lay__grid">
              {list.map((l) => (
                <LayoutCard key={l.key} l={l} t={t} buildings={buildings} dev={dev} fav={favIds.includes(l.lead.id)}
                  onOpen={() => open(l.key)} />
              ))}
            </div>
          </section>
        );
      })}
      {shown.length === 0 && (
        <div className="lay__empty">
          <p>{t('No layouts match these filters.')}</p>
          <button type="button" className="btn btn--ghost" onClick={clear}>{t('Clear filters')}</button>
        </div>
      )}

      {current && (
        <LayoutModal l={current} all={layouts} t={t} buildings={buildings} dev={dev} agent={agent} me={me}
          favIds={favIds} levelPlans={levelPlans} visitHref={visitHref} onClose={close} onOpen={open} />
      )}
    </div>
  );
}

/** Рядки з іконками під ціною — дві колонки, як на LUN */
function facts(l: Layout, t: T, buildings: Building[], dev: Props['dev']) {
  const blds = l.buildingIds.map((id) => buildings.find((b) => b.id === id)).filter(Boolean) as Building[];
  const completion = [...new Set(blds.map((b) => b.completion).filter(Boolean))].join(', ') || dev.completion;
  const stages = [...new Set(blds.map((b) => b.stage))];
  return [
    ['bed', kind(t, l.beds)],
    ['area', l.area[1] ? `${span(l.area[0], l.area[1])} m²` : ''],
    ['stairs', l.floors.length ? `${t(l.floors.length > 1 ? 'Floors' : 'Floor')}: ${floorRanges(l.floors)}` : ''],
    ['building', blds.map((b) => b.name).join(', ')],
    ['calendar', completion],
    ['crane', stages.length === 1 ? t(stageLabel(stages[0])) : ''],
    ['bath', t(l.lead.baths >= 2 ? '{n} bathrooms' : '1 bathroom', { n: l.lead.baths })],
  ].filter(([, v]) => v) as [string, string][];
}

function LayoutCard({ l, t, buildings, dev, fav, onOpen }: {
  l: Layout; t: T; buildings: Building[]; dev: Props['dev']; fav: boolean; onOpen: () => void;
}) {
  const per = ppmLine(l);
  return (
    <article className="lay__card" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}>
      <div className={`lay__img${l.plan ? ' is-plan' : ''}`}>
        <Photo src={l.plan || l.lead.photos[0] || ''} alt={`${kind(t, l.beds)} ${l.area[0]} m²`} label="Plan coming soon" />
        <FavButton listingId={l.lead.id} initial={fav} className="fav lay__fav" />
        {l.type && <span className="lay__type">{t('Type {type}', { type: l.type })}</span>}
      </div>
      <div className="lay__body">
        <div className="lay__price">
          {l.open.length ? (per ? <>{per} <span>{t('per m²')}</span></> : fmtUsd(l.lead.price)) : t('Sold out')}
        </div>
        {l.open.length > 0 && (
          <div className="lay__sub">
            {t('from {price}', { price: fmtUsd(l.lead.price) })} · <span className="lay__avail">{t('{n} of {total} available', { n: l.open.length, total: l.units.length })}</span>
          </div>
        )}
        <ul className="lay__facts">
          {facts(l, t, buildings, dev).slice(0, 6).map(([icon, v]) => (
            <li key={icon}><Icon name={icon} size={18} /><span>{v}</span></li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function LayoutModal({ l, all, t, buildings, dev, agent, me, favIds, levelPlans, visitHref, onClose, onOpen }: {
  l: Layout; all: Layout[]; t: T; buildings: Building[]; dev: Props['dev']; agent: Agent;
  me: Props['me']; favIds: string[]; levelPlans: Record<number, string>; visitHref?: string;
  onClose: () => void; onOpen: (key: string) => void;
}) {
  const lp = useLp();
  const boxRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(4);
  const planFloors = l.floors.filter((f) => levelPlans[f]);
  const [lvl, setLvl] = useState<number | null>(planFloors[0] ?? null);

  // нове планування (зі «схожих») — на свій поверх, знову 4 схожих і вгору вікна
  const [seen, setSeen] = useState(l.key);
  if (seen !== l.key) {
    setSeen(l.key);
    setMore(4);
    setLvl(planFloors[0] ?? null);
  }
  useEffect(() => { boxRef.current?.scrollTo({ top: 0 }); }, [l.key]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const similar = all.filter((x) => x.key !== l.key)
    .sort((a, b) => Math.abs(a.beds - l.beds) - Math.abs(b.beds - l.beds) || Math.abs(a.area[0] - l.area[0]) - Math.abs(b.area[0] - l.area[0]));
  const per = ppmLine(l);
  const payment = dev.payment.split('\n').map((s) => s.trim()).filter(Boolean);
  const ownerFin = l.units.some((u) => u.ownerFinancing);
  const hoa = l.lead.hoa;
  const toContact = () => document.getElementById('lay-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const title = l.type ? t('Layout type {type}', { type: l.type }) : `${kind(t, l.beds)} · ${span(l.area[0], l.area[1])} m²`;

  return (
    <div className="modal is-open lm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box lm__box" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h3>{t('Layout')}</h3>
          <button className="modal__close" aria-label={t('Close')} onClick={onClose}><Icon name="close" size={22} /></button>
        </div>
        <div className="lm__scroll" ref={boxRef}>
          <div className="lm__grid">
            <div className="lm__main">
              <div className="lm__plan">
                {l.plan
                  ? <a href={l.plan} target="_blank" rel="noopener" title={t('Open full size')}><Photo src={l.plan} alt={title} eager /></a>
                  : <Photo src={l.lead.photos[0]} alt={title} label="Plan coming soon" eager />}
                <FavButton listingId={l.lead.id} initial={favIds.includes(l.lead.id)} className="fav lay__fav" />
              </div>

              <div className="lm__price">
                {l.open.length ? (per ? <>{per}<span>/m²</span></> : fmtUsd(l.lead.price)) : t('Sold out')}
              </div>
              {l.open.length > 0 && <div className="lm__from">{t('from {price}', { price: fmtUsd(l.lead.price) })}</div>}
              <h4 className="lm__name">{title}</h4>
              <ul className="lm__facts">
                {facts(l, t, buildings, dev).map(([icon, v]) => <li key={icon}><Icon name={icon} size={20} /><span>{v}</span></li>)}
                {hoa > 0 && <li><Icon name="wallet" size={20} /><span>{t('HOA ~{sum}/mo', { sum: fmtUsd(hoa) })}</span></li>}
              </ul>

              <h3 className="lm__h">{t('Units with this layout')}</h3>
              <div className="lm__units">
                <div className="lm__urow is-head"><span>{t('Unit')}</span><span>{t('Floor')}</span><span>{t('Area')}</span><span>{t('Price')}</span><span>{t('Status')}</span></div>
                {l.units.map((u) => (
                  <Link key={u.id} href={lp(`/listings/${u.id}`)} className={`lm__urow${isOpen(u) ? '' : ' is-off'}`}>
                    <b>{u.unitNo || '—'}</b>
                    <span>{u.floor ?? '—'}</span>
                    <span>{m2(u) ? `${m2(u)} m²` : '—'}</span>
                    <span><b>{fmtUsd(u.price)}</b>{ppm(u) > 0 && <em>{fmtUsd(ppm(u))}/m²</em>}</span>
                    <span className={`lm__st is-${u.status}`}>{t(statusLabel(u.status))}</span>
                  </Link>
                ))}
              </div>

              {lvl !== null && (
                <>
                  <h3 className="lm__h">{t('Floor plan')}</h3>
                  {planFloors.length > 1 && (
                    <div className="lm__tabs" role="tablist">
                      {planFloors.map((f) => (
                        <button key={f} type="button" role="tab" aria-selected={f === lvl}
                          className={`lay__chip${f === lvl ? ' is-on' : ''}`} onClick={() => setLvl(f)}>{t('Floor {n}', { n: f })}</button>
                      ))}
                    </div>
                  )}
                  <a className="lm__level" href={levelPlans[lvl]} target="_blank" rel="noopener" title={t('Open full size')}>
                    <img src={levelPlans[lvl]} alt={t('Floor {n} plan', { n: lvl })} loading="lazy" />
                  </a>
                  <p className="small muted">
                    {t('This layout on floor {n}: unit {units}', { n: lvl, units: l.units.filter((u) => u.floor === lvl).map((u) => u.unitNo).join(', ') })}
                  </p>
                </>
              )}

              <h3 className="lm__h">{t('Payment & financing')}</h3>
              <div className="lm__fin">
                {payment.length > 0 && (
                  <FinCard title={t('Developer payment plan')} lines={payment} on cta={t('Message the developer')} onCta={toContact} />
                )}
                {ownerFin && (
                  <FinCard title={t('Owner financing')} lines={[t('Available for this layout')]} on cta={t('Message the developer')} onCta={toContact} />
                )}
                <FinCard title={t('Mortgage and other options')} lines={[t('Ask the sales team which banks and terms apply')]} on
                  cta={t('Ask the sales team')} onCta={toContact} />
              </div>
            </div>

            <aside className="lm__side" id="lay-contact">
              <AgentContact agent={agent} listing={l.lead} topic={`${dev.name}, ${title}`} fromPrice={l.open.length ? l.lead.price : null} isFav={favIds.includes(l.lead.id)}
                listingUrl={`${SITE_URL}/developments/${dev.slug}/layouts?layout=${encodeURIComponent(l.key)}`}
                me={me} visitHref={visitHref} />
            </aside>
          </div>

          {similar.length > 0 && (
            <section className="lm__similar">
              <h3 className="lm__h">{t('Similar layouts')}</h3>
              <div className="lay__grid lay__grid--4">
                {similar.slice(0, more).map((x) => (
                  <LayoutCard key={x.key} l={x} t={t} buildings={buildings} dev={dev} fav={favIds.includes(x.lead.id)}
                    onOpen={() => onOpen(x.key)} />
                ))}
              </div>
              {similar.length > more && (
                <button type="button" className="lm__more" onClick={() => setMore((n) => n + 8)}>
                  <Icon name="plus" size={18} />
                  {t(similar.length - more === 1 ? 'Show 1 more layout' : 'Show {n} more layouts', { n: similar.length - more })}
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function FinCard({ title, lines, on, cta, onCta }: { title: string; lines: string[]; on: boolean; cta?: string; onCta: () => void }) {
  return (
    <div className={`lm__fincard${on ? ' is-on' : ''}`}>
      <div className="lm__finbody">
        <b>{title}</b>
        {lines.map((s) => <span key={s}>{s}</span>)}
      </div>
      {cta && (
        <button type="button" className="lm__fincta" onClick={onCta}>{cta}<Icon name="arrowRight" size={18} /></button>
      )}
    </div>
  );
}
