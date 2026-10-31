'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { fmtNumber, fmtPriceShort, fmtUsd, photoUrl } from '@/lib/format';
import { WEEKDAYS, fmtHours, hourLabel, type Analytics, type ListingStat } from '@/lib/analytics';
import { useT } from './LangProvider';

/**
 * Вкладка «Analytics» у кабінеті ріелтора / агенції. Дані рахує /api/analytics,
 * тут лише малюємо: графіки — власний SVG, без бібліотек (вони б важили більше за всю сторінку).
 */

type Data = Analytics & { scope: 'own' | 'agency' };

export const C = { views: '#2a78d6', visitors: '#4a3aa7', leads: '#eb6834', good: '#0ca30c', bad: '#d03b3b' };
// послідовна шкала одного тону (світліше = менше) — для теплової карти й воронки
export const BLUE = ['#eef4fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

export const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Найближче «кругле» значення для осі: 1, 2, 5, 10, 20… */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/* ---------- дрібні елементи ---------- */

function Delta({ cur, prev, suffix = '%', invert = false }: { cur: number; prev: number; suffix?: string; invert?: boolean }) {
  if (prev <= 0 && cur <= 0) return <span className="an-delta">—</span>;
  if (prev <= 0) return <span className="an-delta an-delta--up">new</span>;
  const d = suffix === 'pp' ? Math.round((cur - prev) * 10) / 10 : Math.round(((cur - prev) / prev) * 100);
  if (d === 0) return <span className="an-delta">0{suffix === 'pp' ? ' pp' : '%'}</span>;
  const good = invert ? d < 0 : d > 0;
  return (
    <span className={`an-delta ${good ? 'an-delta--up' : 'an-delta--down'}`}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d)}{suffix === 'pp' ? ' pp' : '%'}
    </span>
  );
}

export function Spark({ data, color, w = 96, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="an-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Kpi({ label, value, cur, prev, spark, color, suffix, hint }: {
  label: string; value: string; cur: number; prev: number; spark?: number[]; color?: string; suffix?: string; hint?: string;
}) {
  return (
    <div className="an-kpi" title={hint}>
      <span className="muted small">{label}</span>
      <b>{value}</b>
      <div className="an-kpi__foot">
        <Delta cur={cur} prev={prev} suffix={suffix} />
        {spark && color && <Spark data={spark} color={color} />}
      </div>
    </div>
  );
}

/* ---------- графік у часі: лінії переглядів і відвідувачів ---------- */

export function TrendChart({ series }: { series: Data['series'] }) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240, padL = 36, padR = 12, padT = 14, padB = 26;
  const W = Math.max(280, width);
  const max = niceMax(Math.max(1, ...series.map((d) => d.views)));
  const x = (i: number) => padL + (series.length > 1 ? (i / (series.length - 1)) * (W - padL - padR) : 0);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const line = (k: 'views' | 'visitors') => series.map((d, i) => `${t(i ? 'L' : 'M')}${x(i)},${y(d[k])}`).join('');
  const area = `${line('views')}L${x(series.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, max / 2, max];
  const every = Math.ceil(series.length / Math.max(2, Math.floor(W / 80)));

  function move(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }
  const d = hover !== null ? series[hover] : null;

  return (
    <div className="an-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={t('Views and unique visitors per day')}>
        <defs>
          <linearGradient id="an-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.views} stopOpacity=".18" />
            <stop offset="1" stopColor={C.views} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((x) => (
          <g key={x}>
            <line x1={padL} x2={W - padR} y1={y(x)} y2={y(x)} className="an-grid" />
            <text x={padL - 8} y={y(x) + 4} textAnchor="end" className="an-axis">{fmtNumber(x)}</text>
          </g>
        ))}
        {series.map((s, i) => (i % every === 0 || i === series.length - 1) && (
          <text key={s.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} className="an-axis">
            {shortDay(s.date)}
          </text>
        ))}
        <path d={area} fill="url(#an-area)" />
        <path d={line('visitors')} fill="none" stroke={C.visitors} strokeWidth={2} strokeLinejoin="round" />
        <path d={line('views')} fill="none" stroke={C.views} strokeWidth={2} strokeLinejoin="round" />
        {d && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} className="an-cross" />
            <circle cx={x(hover)} cy={y(d.views)} r={4.5} fill={C.views} stroke="#fff" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(d.visitors)} r={4.5} fill={C.visitors} stroke="#fff" strokeWidth={2} />
          </g>
        )}
        <rect x={padL} y={0} width={W - padL - padR} height={H} fill="transparent"
          onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} />
      </svg>
      {d && hover !== null && (
        <div className="an-tip" style={{ left: Math.min(Math.max(x(hover), 70), W - 70), top: 6 }}>
          <b>{shortDay(d.date)}</b>
          <span><i style={{ background: C.views }} />{t('Views')} <b>{d.views}</b></span>
          <span><i style={{ background: C.visitors }} />{t('Visitors')} <b>{d.visitors}</b></span>
          <span><i style={{ background: C.leads }} />{t('Leads')} <b>{d.leads}</b></span>
        </div>
      )}
    </div>
  );
}

/** Стовпчик, заокруглений лише зверху: низ стоїть на осі. */
function barPath(x0: number, base: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x0},${base}V${base - h + r}Q${x0},${base - h} ${x0 + r},${base - h}H${x0 + w - r}Q${x0 + w},${base - h} ${x0 + w},${base - h + r}V${base}Z`;
}

/* ---------- заявки по днях: окремий графік, бо інший масштаб ---------- */

/** Стовпчики по днях для однієї величини; tip — додаткові рядки підказки. */
export function DayBars({ points, color, label, tip }: {
  points: { date: string; value: number }[]; color: string; label: string;
  tip?: (i: number) => React.ReactNode;
}) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 120, padL = 36, padR = 12, padT = 10, padB = 8;
  const W = Math.max(280, width);
  const max = niceMax(Math.max(1, ...points.map((d) => d.value)));
  const slot = (W - padL - padR) / Math.max(1, points.length);
  const bw = Math.max(2, Math.min(18, slot - 2));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const d = hover !== null ? points[hover] : null;
  return (
    <div className="an-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={t('{label} per day', { label })}>
        {[0, max].map((x) => (
          <g key={x}>
            <line x1={padL} x2={W - padR} y1={y(x)} y2={y(x)} className="an-grid" />
            <text x={padL - 8} y={y(x) + 4} textAnchor="end" className="an-axis">{fmtNumber(x)}</text>
          </g>
        ))}
        {points.map((s, i) => {
          const h = y(0) - y(s.value);
          const cx = padL + slot * i + slot / 2;
          return (
            <g key={s.date}>
              {s.value > 0 && (
                <path d={barPath(cx - bw / 2, y(0), bw, h)}
                  fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
              <rect x={padL + slot * i} y={0} width={slot} height={H} fill="transparent"
                onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {d && hover !== null && (
        <div className="an-tip" style={{ left: Math.min(Math.max(padL + slot * hover + slot / 2, 60), W - 60), top: 0 }}>
          <b>{shortDay(d.date)}</b>
          <span><i style={{ background: color }} />{label} <b>{d.value}</b></span>
          {tip?.(hover)}
        </div>
      )}
    </div>
  );
}

function LeadBars({ series }: { series: Data['series'] }) {
  const t = useT();
  return (
    <DayBars points={series.map((s) => ({ date: s.date, value: s.leads }))} color={C.leads} label={t('Leads')}
      tip={(i) => <span>{t('Contacts opened')} <b>{series[i].contacts}</b></span>} />
  );
}

/* ---------- воронка ---------- */

export function Funnel({ steps }: { steps: Data['funnel'] }) {
  const t = useT();
  const top = Math.max(1, steps[0]?.value ?? 1);
  const shades = [BLUE[6], BLUE[5], BLUE[4], C.leads];
  return (
    <div className="an-funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : 0;
        const rate = i > 0 && prev > 0 ? Math.round((s.value / prev) * 1000) / 10 : null;
        return (
          <div key={s.key} className="an-funnel__row">
            <div className="an-funnel__label">
              <span>{t(s.label)}</span>
              <b>{fmtNumber(s.value)}</b>
            </div>
            <div className="an-funnel__track">
              <div className="an-funnel__bar" style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%`, background: shades[i] }} />
            </div>
            <span className="an-funnel__rate tiny muted">{rate !== null ? `${rate}% of previous step` : ' '}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- горизонтальні смуги ---------- */

export function BarList({ items, color, empty }: { items: { key: string; label: string; value: number }[]; color: string; empty: string }) {
  const t = useT();
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="an-bars">
      {items.map((i) => (
        <div key={i.key} className="an-bars__row" title={`${t(i.label)}: ${i.value}`}>
          <div className="an-bars__head">
            <span>{t(i.label)}</span>
            <span><b>{fmtNumber(i.value)}</b> <span className="muted tiny">{total ? Math.round((i.value / total) * 100) : 0}%</span></span>
          </div>
          <div className="an-bars__track"><div style={{ width: `${(i.value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ---------- теплова карта: день тижня × година ---------- */

export function Heatmap({ grid }: { grid: number[][] }) {
  const t = useT();
  const max = Math.max(1, ...grid.flat());
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  return (
    <div className="an-heat">
      <div className="an-heat__grid" onPointerLeave={() => setHover(null)}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="an-heat__hour">{h % 6 === 0 ? hourLabel(h) : ''}</span>
        ))}
        {grid.map((row, d) => (
          <div key={d} style={{ display: 'contents' }}>
            <span className="an-heat__day">{t(WEEKDAYS[d]).slice(0, 3)}</span>
            {row.map((v, h) => {
              const step = v === 0 ? 0 : 1 + Math.min(6, Math.floor((v / max) * 6.999));
              return (
                <span key={h} className={`an-heat__cell ${hover?.d === d && hover?.h === h ? 'is-on' : ''}`}
                  style={{ background: BLUE[step] }}
                  onPointerEnter={() => setHover({ d, h })} onPointerDown={() => setHover({ d, h })} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="an-heat__foot tiny muted">
        {hover
          ? <span><b>{t(WEEKDAYS[hover.d])}, {hourLabel(hover.h)}–{hourLabel((hover.h + 1) % 24)}</b>: {t('{n} views', { n: grid[hover.d][hover.h] })}</span>
          : <span>{t('Honduras time. Hover a cell for the count.')}</span>}
        <span className="an-heat__legend">{t('Fewer')} {BLUE.slice(1).map((c) => <i key={c} style={{ background: c }} />)} {t('More')}</span>
      </div>
    </div>
  );
}

/* ---------- таблиця оголошень ---------- */

const FLAG_LABEL: Record<ListingStat['flags'][number], { text: string; tone: 'warn' | 'good' | 'info' }> = {
  overpriced: { text: 'Above market', tone: 'warn' },
  underpriced: { text: 'Below market', tone: 'good' },
  no_leads: { text: 'Views, no leads', tone: 'warn' },
  no_views: { text: 'No views', tone: 'warn' },
  few_photos: { text: 'Few photos', tone: 'info' },
};

type SortKey = 'views' | 'visitors' | 'contacts' | 'leads' | 'conversion' | 'favorites' | 'daysOnMarket' | 'priceDelta';
const SORTS: [SortKey, string][] = [
  ['views', 'Views'], ['visitors', 'Visitors'], ['contacts', 'Contacts'], ['leads', 'Leads'],
  ['conversion', 'Conversion'], ['favorites', 'Saved'], ['priceDelta', 'Price vs area'], ['daysOnMarket', 'Days on market'],
];

export function ListingTable({ rows, agentName }: { rows: ListingStat[]; agentName?: (id: string) => string }) {
  const t = useT();
  const [sort, setSort] = useState<SortKey>('views');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [limit, setLimit] = useState(10);
  const sorted = useMemo(() => {
    const r = onlyIssues ? rows.filter((l) => l.flags.some((f) => FLAG_LABEL[f].tone === 'warn')) : rows;
    return [...r].sort((a, b) => ((b[sort] ?? -999) as number) - ((a[sort] ?? -999) as number));
  }, [rows, sort, onlyIssues]);

  const th = (k: SortKey, label: string, title?: string) => (
    <th className={`an-th ${sort === k ? 'is-on' : ''}`} onClick={() => setSort(k)} title={title && t(title)}>{t(label)}{sort === k ? ' ↓' : ''}</th>
  );

  return (
    <>
      <div className="an-sub">
        {/* на телефоні заголовків колонок немає — сортуємо списком */}
        <label className="an-sort">
          {t('Sort by')}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
          </select>
        </label>
        <label className="an-check">
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> {t('Only listings that need attention')}
        </label>
      </div>
      <div className="an-scroll">
        <table className="table an-table">
          <thead>
            <tr>
              <th>{t('Listing')}</th>
              {th('views', 'Views')}
              <th>{t('Trend')}</th>
              {th('visitors', 'Visitors')}
              {th('contacts', 'Contacts', 'Unique buyers who opened the phone, a messenger or the viewing form')}
              {th('leads', 'Leads')}
              {th('conversion', 'Conv.', 'Leads ÷ unique visitors')}
              {th('favorites', 'Saved')}
              {th('priceDelta', '$/ft² vs area', 'Price per ft² against the median of the same type in the same area')}
              {th('daysOnMarket', 'Days')}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="an-lst">
                    {photoUrl(l.photo) ? <img className="thumb" src={photoUrl(l.photo)} alt="" /> : <span className="thumb an-lst__nophoto" />}
                    <div>
                      <Link href={`/listings/${l.id}`} className="an-lst__title">{l.title}</Link>
                      <div className="tiny muted">
                        {fmtPriceShort(l.price, l.deal)} · {l.development?.name ?? l.neighborhood}
                        {agentName && ` · ${agentName(l.agentId)}`}
                        {!l.active && ' · hidden'}
                      </div>
                      {l.flags.length > 0 && (
                        <div className="an-flags">
                          {l.flags.map((f) => <span key={f} className={`an-flag an-flag--${FLAG_LABEL[f].tone}`}>{t(FLAG_LABEL[f].text)}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label={t('Views')}><b>{fmtNumber(l.views)}</b><div className="tiny muted">{fmtNumber(l.allTimeViews)} total</div></td>
                <td data-label={t('Trend')} className="an-td-trend"><Spark data={l.trend} color={C.views} w={72} h={24} /></td>
                <td data-label={t('Visitors')}>{fmtNumber(l.visitors)}</td>
                <td data-label={t('Contacts')}>{fmtNumber(l.contacts)}</td>
                <td data-label={t('Leads')}><b>{l.leads}</b></td>
                <td data-label={t('Conv.')}>{l.visitors ? `${l.conversion}%` : '—'}</td>
                <td data-label={t('Saved')}>{l.favorites}</td>
                <td data-label={t('vs area')}>
                  {l.priceDelta === null ? <span className="muted">—</span> : (
                    <span className={l.priceDelta >= 20 ? 'an-bad' : l.priceDelta <= -10 ? 'an-good' : ''}>
                      {l.priceDelta > 0 ? '+' : ''}{l.priceDelta}%
                      <div className="tiny muted">{fmtUsd(l.ppsf)} vs {fmtUsd(l.marketPpsf)}</div>
                    </span>
                  )}
                </td>
                <td data-label={t('Days')}>{l.daysOnMarket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <button className="btn btn--ghost btn--sm" style={{ marginTop: 12 }} onClick={() => setLimit((n) => n + 20)}>
          Show more ({sorted.length - limit})
        </button>
      )}
      {sorted.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>{t('Nothing needs attention right now.')}</p>}
    </>
  );
}

/* ---------- райони: мої $/ft² проти ринку ---------- */

export function AreaCompare({ areas }: { areas: Data['areas'] }) {
  const t = useT();
  const max = Math.max(1, ...areas.flatMap((a) => [a.mine, a.market])) * 1.08;
  return (
    <div className="an-areas">
      <div className="an-legend tiny">
        <span><i style={{ background: C.views }} />{t('Your median')}</span>
        <span><i className="an-legend__ring" />{t('Market median')}</span>
      </div>
      {areas.map((a) => {
        const diff = a.market ? Math.round(((a.mine - a.market) / a.market) * 100) : 0;
        return (
          <div key={a.neighborhood} className="an-area" title={`${a.myCount} of yours vs ${a.marketCount} on the market`}>
            <div className="an-area__head">
              <span>{a.neighborhood}</span>
              <span className="tiny"><b>{fmtUsd(a.mine)}</b> vs {fmtUsd(a.market)}/ft² <span className={diff >= 15 ? 'an-bad' : diff <= -10 ? 'an-good' : 'muted'}>({diff > 0 ? '+' : ''}{diff}%)</span></span>
            </div>
            <div className="an-area__track">
              <span className="an-area__span" style={{ left: `${(Math.min(a.mine, a.market) / max) * 100}%`, width: `${(Math.abs(a.mine - a.market) / max) * 100}%` }} />
              <span className="an-area__dot an-area__dot--mkt" style={{ left: `${(a.market / max) * 100}%` }} />
              <span className="an-area__dot" style={{ left: `${(a.mine / max) * 100}%`, background: C.views }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- сама вкладка ---------- */

export default function AnalyticsPanel({ isOwner, agencyName }: { isOwner: boolean; agencyName?: string }) {
  const t = useT();
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState<'own' | 'agency'>(isOwner ? 'agency' : 'own');
  const [data, setData] = useState<Data | null>(null);
  // який зріз уже завантажено: поки він не збігається з обраним — показуємо, що вантажимо
  const [loaded, setLoaded] = useState('');
  const want = `${days}|${scope}`;
  const loading = loaded !== want;
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let off = false;
    const key = `${days}|${scope}`;
    fetch(`/api/analytics?days=${days}&scope=${scope}`).then((r) => r.json()).then((d) => {
      if (!off) { setData(d.totals ? d : null); setLoaded(key); }
    }).catch(() => { if (!off) setLoaded(key); });
    return () => { off = true; };
  }, [days, scope]);

  const memberName = useMemo(() => {
    const m = new Map((data?.agents ?? []).map((a) => [a.id, a.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [data]);

  const filters = (
    <div className="an-filters">
      <div className="chip-row">
        {[7, 30, 90].map((d) => (
          <button key={d} className={`chip-btn ${days === d ? 'is-on' : ''}`} onClick={() => setDays(d)}>{d} days</button>
        ))}
      </div>
      {isOwner && (
        <div className="chip-row">
          <button className={`chip-btn ${scope === 'own' ? 'is-on' : ''}`} onClick={() => setScope('own')}>{t('Mine')}</button>
          <button className={`chip-btn ${scope === 'agency' ? 'is-on' : ''}`} onClick={() => setScope('agency')}>{agencyName ?? t('Whole agency')}</button>
        </div>
      )}
    </div>
  );

  if (!data) {
    return (
      <div className="panel an">
        {filters}
        <div className="empty">{t(loading ? 'Crunching the numbers…' : 'Could not load analytics. Try again in a minute.')}</div>
      </div>
    );
  }

  const { totals, prev, series } = data;
  const spark = (k: 'views' | 'visitors' | 'contacts' | 'leads') => series.map((d) => d[k]);
  const devTotal = data.devices.mobile + data.devices.desktop;
  const mobilePct = devTotal ? Math.round((data.devices.mobile / devTotal) * 100) : 0;

  return (
    <div className={`an ${loading ? 'is-loading' : ''}`}>
      <div className="an-top">
        <div>
          <h3>{t('Analytics')}</h3>
          <p className="muted small">
            {data.scope === 'agency' ? t('{name}, all agents', { name: agencyName ?? t('Agency') }) : t('Your listings')} · {t('last {n} days, compared with the {n} days before', { n: data.days })}
          </p>
        </div>
        {filters}
      </div>

      {!data.tracked && (
        <div className="note-ok an-note">
          <Icon name="sparkle" size={18} />
          <span>{t('Detailed tracking (visitors, sources, contact clicks) starts now, so charts fill up over the next days. Total views and leads below already include history.')}</span>
        </div>
      )}

      <div className="an-kpis">
        <Kpi label={t('Views')} value={fmtNumber(totals.views)} cur={totals.views} prev={prev.views} spark={spark('views')} color={C.views} />
        <Kpi label={t('Unique visitors')} value={fmtNumber(totals.visitors)} cur={totals.visitors} prev={prev.visitors} spark={spark('visitors')} color={C.visitors} />
        <Kpi label={t('Opened contacts')} value={fmtNumber(totals.contacts)} cur={totals.contacts} prev={prev.contacts} spark={spark('contacts')} color={C.leads}
          hint={t('Unique buyers who revealed the phone, tapped a messenger or opened the viewing form')} />
        <Kpi label={t('Leads')} value={fmtNumber(totals.leads)} cur={totals.leads} prev={prev.leads} spark={spark('leads')} color={C.leads} />
        <Kpi label={t('Conversion')} value={`${totals.conversion}%`} cur={totals.conversion} prev={prev.conversion} suffix="pp" hint={t('Leads ÷ unique visitors')} />
        <Kpi label={t('Reply time')} value={data.responseHours === null ? '—' : fmtHours(data.responseHours)} cur={0} prev={0}
          hint={t('Median time from a lead arriving to “Mark handled”')} />
      </div>

      {data.insights.length > 0 && (
        <div className="panel an-insights">
          <h4><Icon name="sparkle" size={18} /> {t('What to do next')}</h4>
          <ul>
            {data.insights.map((i) => (
              <li key={i.text} className={`an-ins an-ins--${i.tone}`}>
                <span className="an-ins__ico">{i.tone === 'good' ? '▲' : i.tone === 'warn' ? '!' : 'i'}</span>
                {i.tpl ? t(i.tpl, { ...i.vars, ...(i.vars?.day ? { day: t(String(i.vars.day)) } : {}) }) : i.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <div className="an-head">
          <h4>{t('Traffic')}</h4>
          <div className="an-legend tiny">
            <span><i style={{ background: C.views }} />{t('Views')}</span>
            <span><i style={{ background: C.visitors }} />{t('Unique visitors')}</span>
            <button className="an-link" onClick={() => setShowTable((v) => !v)}>{t(showTable ? 'Show chart' : 'Show as table')}</button>
          </div>
        </div>
        {showTable ? (
          <div className="an-scroll" style={{ maxHeight: 320 }}>
            <table className="table an-table">
              <thead><tr><th>{t('Day')}</th><th>{t('Views')}</th><th>{t('Visitors')}</th><th>{t('Contacts')}</th><th>{t('Leads')}</th></tr></thead>
              <tbody>
                {[...series].reverse().map((d) => (
                  <tr key={d.date}><td>{shortDay(d.date)}</td><td data-label={t('Views')}>{d.views}</td><td data-label={t('Visitors')}>{d.visitors}</td><td data-label={t('Contacts')}>{d.contacts}</td><td data-label={t('Leads')}>{d.leads}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <TrendChart series={series} />
            <div className="an-head" style={{ marginTop: 20 }}>
              <h4 className="small">{t('Leads per day')}</h4>
            </div>
            <LeadBars series={series} />
          </>
        )}
      </div>

      <div className="an-grid2">
        <div className="panel">
          <h4>{t('Funnel')}</h4>
          <p className="muted tiny an-cap">{t('From seeing a listing to sending an enquiry')}</p>
          <Funnel steps={data.funnel} />
        </div>
        <div className="panel">
          <h4>{t('How buyers reach you')}</h4>
          <p className="muted tiny an-cap">{t('Contact actions and leads by channel')}</p>
          <BarList items={data.channels} color={C.leads} empty="No contacts yet in this period." />
        </div>
      </div>

      <div className="an-grid2">
        <div className="panel">
          <h4>{t('Where visitors come from')}</h4>
          <p className="muted tiny an-cap">{t('Share links with')} <code>?utm_source=facebook</code> to see your own campaigns here</p>
          <BarList items={data.sources} color={C.views} empty="No tracked visits yet." />
          {devTotal > 0 && (
            <div className="an-device">
              <div className="an-device__bar">
                <span style={{ width: `${mobilePct}%`, background: C.views }} />
                <span style={{ width: `${100 - mobilePct}%`, background: C.visitors }} />
              </div>
              <div className="an-legend tiny">
                <span><i style={{ background: C.views }} />Phone {mobilePct}%</span>
                <span><i style={{ background: C.visitors }} />Computer {100 - mobilePct}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="panel">
          <h4>{t('When buyers look')}</h4>
          <p className="muted tiny an-cap">
            {data.peak ? t('Peak: {day} around {hour}', { day: t(WEEKDAYS[data.peak.day]), hour: hourLabel(data.peak.hour) }) : t('Views by weekday and hour')}
          </p>
          <Heatmap grid={data.heatmap} />
        </div>
      </div>

      {data.agents.length > 0 && data.scope === 'agency' && (
        <div className="panel">
          <h4>{t('Team leaderboard')}</h4>
          <p className="muted tiny an-cap">{t('Ranked by leads, then views')}</p>
          <div className="an-scroll">
            <table className="table an-table">
              <thead>
                <tr><th>#</th><th>{t('Agent')}</th><th>{t('Listings')}</th><th>{t('Views')}</th><th>{t('Contacts')}</th><th>{t('Leads')}</th><th>{t('Conv.')}</th><th>{t('Reply time')}</th><th>{t('Handled')}</th></tr>
              </thead>
              <tbody>
                {data.agents.map((a, i) => {
                  const top = Math.max(1, data.agents[0].leads);
                  return (
                    <tr key={a.id}>
                      <td className="an-td-rank">{i < 3 && a.leads > 0 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                      <td><Link href={`/agents/${a.id}`}><b>{a.name}</b></Link></td>
                      <td data-label={t('Listings')}>{a.active}<span className="muted tiny"> / {a.listings}</span></td>
                      <td data-label={t('Views')}>{fmtNumber(a.views)}</td>
                      <td data-label={t('Contacts')}>{fmtNumber(a.contacts)}</td>
                      <td data-label={t('Leads')}>
                        <div className="an-inline">
                          <b>{a.leads}</b>
                          <span className="an-inline__bar"><span style={{ width: `${(a.leads / top) * 100}%`, background: C.leads }} /></span>
                        </div>
                      </td>
                      <td data-label={t('Conv.')}>{a.conversion}%</td>
                      <td data-label={t('Reply time')}>{a.responseHours === null ? '—' : fmtHours(a.responseHours)}</td>
                      <td data-label={t('Handled')}>{a.leads ? `${a.handledShare}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <h4>{t('Listing performance')}</h4>
        <p className="muted tiny an-cap">{t('Click a column to sort. Price is compared with the median $/ft² of the same property type in the same area.')}</p>
        {data.listings.length ? (
          <ListingTable rows={data.listings} agentName={data.scope === 'agency' ? memberName : undefined} />
        ) : <p className="muted small">{t('No listings yet.')}</p>}
      </div>

      {data.developments.length > 0 && (
        <div className="panel">
          <h4>{t('Developments')}</h4>
          <p className="muted tiny an-cap">{t('Page views of the development plus views of its units')}</p>
          <div className="an-devs">
            {data.developments.map((d) => {
              const soldPct = d.units ? Math.round((d.sold / d.units) * 100) : 0;
              return (
                <Link key={d.id} href={`/developments/${d.slug}`} className="an-dev">
                  <b>{d.name}</b>
                  <div className="an-dev__nums">
                    <span><b>{fmtNumber(d.pageViews + d.unitViews)}</b><span className="tiny muted">views</span></span>
                    <span><b>{fmtNumber(d.contacts)}</b><span className="tiny muted">contacts</span></span>
                    <span><b>{d.leads}</b><span className="tiny muted">leads</span></span>
                  </div>
                  {d.units > 0 && (
                    <>
                      <div className="an-dev__bar"><span style={{ width: `${soldPct}%` }} /></div>
                      <span className="tiny muted">{d.sold} of {d.units} units sold or rented · {d.available} available</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {data.areas.length > 0 && (
        <div className="panel">
          <h4>{t('Your prices vs the market')}</h4>
          <p className="muted tiny an-cap">{t('Median asking price per ft² for sale listings, by area')}</p>
          <AreaCompare areas={data.areas} />
        </div>
      )}
    </div>
  );
}
