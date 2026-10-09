'use client';
import Link from 'next/link';
import { Fragment, useMemo, useRef, useState } from 'react';
import BulkBar from './BulkBar';
import Icon from './Icon';
import Photo from './Photo';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPrice } from '@/lib/format';
import { lifecycle } from '@/lib/lifecycle';
import { listingScore, scoreTone } from '@/lib/listingScore';
import { UNIT_STATUSES, statusLabel } from '@/lib/units';
import type { Listing, PropertyType } from '@/lib/types';

type Sort = 'new' | 'price_asc' | 'price_desc' | 'views' | 'unit';
type Group = { key: string; name: string; slug: string | null; items: Listing[] };
/** Шматок групи на одній сторінці: заголовок ЖК + ті його квартири, що влізли */
type Segment = { g: Group; items: Listing[]; cont: boolean };

const STANDALONE = 'standalone';
// Великі ЖК згорнуті, поки нічого не шукають: інакше 30 однакових квартир ховають решту
const COLLAPSE_OVER = 8;
const PER_PAGE = 20;

/**
 * Таблиця оголошень у кабінеті: фільтри зверху, квартири згруповані за ЖК.
 * Фільтрує на клієнті — кабінет і так вантажить усі оголошення ріелтора чи агенції.
 */
export default function DashboardListings({ listings, agentName, onEdit, onToggle, onDelete, onRenew, onSubmit, onBulkDone }: {
  listings: Listing[];
  /** Є лише в режимі «вся агенція» — тоді показуємо колонку й фільтр «Agent» */
  agentName?: (id: string) => string;
  onEdit: (l: Listing) => void;
  onToggle: (l: Listing) => void;
  onDelete: (l: Listing) => void;
  /** Продовжити показ ще на 90 днів */
  onRenew?: (l: Listing) => void;
  /** Чернетку чи відхилене — на публікацію (перевіреному ріелтору) або на перевірку */
  onSubmit?: (l: Listing) => void;
  /** Є — показуємо галочки й масові дії; викликається після них, щоб перечитати список */
  onBulkDone?: () => void;
}) {
  const [q, setQ] = useState('');
  const [dev, setDev] = useState('');
  const [deal, setDeal] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [agent, setAgent] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  // явно розгорнуті/згорнуті групи; решта — за правилом COLLAPSE_OVER
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // сторінка памʼятає, для яких фільтрів її обрали: нові фільтри чи сортування — знову перша
  const [pageAt, setPageAt] = useState({ key: '', page: 1 });
  const top = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // повнота кожного оголошення — для колонки Quality і фільтра «потребує уваги»
  const scores = useMemo(() => new Map(listings.map((l) => [l.id, listingScore(l)])), [listings]);

  const devs = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of listings) if (l.developmentId) m.set(l.developmentId, l.development?.name ?? 'Development');
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [listings]);
  const types = useMemo(() => [...new Set(listings.map((l) => l.type))], [listings]);
  const agents = useMemo(() => (agentName ? [...new Set(listings.map((l) => l.agentId))] : []), [listings, agentName]);
  const hasStandalone = listings.some((l) => !l.developmentId);

  const filtering = Boolean(q || dev || deal || type || status || agent);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = listings.filter((l) => {
      if (dev === STANDALONE ? l.developmentId : dev && l.developmentId !== dev) return false;
      if (deal && l.deal !== deal) return false;
      if (type && l.type !== type) return false;
      if (agent && l.agentId !== agent) return false;
      const lc = lifecycle(l);
      if (status === 'live' && lc.key !== 'live') return false;
      if (status === 'hidden' && l.active) return false;
      if (status === 'review' && !['draft', 'pending', 'rejected'].includes(lc.key)) return false;
      if (status === 'expiring' && !lc.canRenew) return false;
      if (status === 'lowq' && (scores.get(l.id)?.pct ?? 100) >= 70) return false;
      if (status && !['live', 'hidden', 'review', 'expiring', 'lowq'].includes(status) && l.status !== status) return false;
      if (needle && ![l.title, l.unitNo, l.neighborhood, l.address, l.development?.name ?? '']
        .some((s) => s.toLowerCase().includes(needle))) return false;
      return true;
    });
    const unitNo = (l: Listing) => l.unitNo.padStart(8, '0');
    const by: Record<Sort, (a: Listing, b: Listing) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      views: (a, b) => b.views - a.views,
      unit: (a, b) => unitNo(a).localeCompare(unitNo(b)),
    };
    return list.sort(by[sort]);
  }, [listings, q, dev, deal, type, status, agent, sort, scores]);

  const groups = useMemo(() => {
    const m = new Map<string, Group>();
    for (const l of shown) {
      const key = l.developmentId ?? STANDALONE;
      if (!m.has(key)) {
        m.set(key, l.developmentId
          ? { key, name: l.development?.name ?? 'Development', slug: l.development?.slug ?? null, items: [] }
          : { key, name: 'Standalone listings', slug: null, items: [] });
      }
      m.get(key)!.items.push(l);
    }
    // ЖК за абеткою, окремі обʼєкти в кінці
    return [...m.values()].sort((a, b) =>
      (a.key === STANDALONE ? 1 : 0) - (b.key === STANDALONE ? 1 : 0) || a.name.localeCompare(b.name));
  }, [shown]);

  const isOpen = (g: Group) => open[g.key] ?? (filtering || groups.length === 1 || g.items.length <= COLLAPSE_OVER);

  // Ріжемо на сторінки по рядках-оголошеннях; згорнутий ЖК займає одне місце.
  // Група, що переходить на наступну сторінку, повторює там свій заголовок.
  const pages = useMemo(() => {
    const out: Segment[][] = [[]];
    let n = 0;
    const take = () => {
      if (n < PER_PAGE) return;
      out.push([]); n = 0;
    };
    for (const g of groups) {
      if (!isOpen(g)) { take(); out[out.length - 1].push({ g, items: [], cont: false }); n++; continue; }
      let first = true;
      for (const l of g.items) {
        take();
        const cur = out[out.length - 1];
        const seg = cur[cur.length - 1];
        if (seg?.g === g) seg.items.push(l);
        else cur.push({ g, items: [l], cont: !first });
        first = false; n++;
      }
    }
    return out;
    // isOpen залежить від open/filtering/groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, open, filtering]);

  const filterKey = JSON.stringify([q, dev, deal, type, status, agent, sort]);
  const pageCount = pages.length;
  const cur = Math.min(pageAt.key === filterKey ? pageAt.page : 1, pageCount);

  function go(p: number) {
    setPageAt({ key: filterKey, page: p });
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    setQ(''); setDev(''); setDeal(''); setType(''); setStatus(''); setAgent('');
  }

  const bulk = Boolean(onBulkDone);
  const cols = (agentName ? 7 : 6) + (bulk ? 1 : 0);
  // вибір переживає фільтри, але не видалені оголошення
  const sel = listings.filter((l) => picked.has(l.id));
  const allShown = shown.length > 0 && shown.every((l) => picked.has(l.id));
  const toggle = (ids: string[], on: boolean) => setPicked((p) => {
    const n = new Set(p);
    ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
    return n;
  });
  const avg = listings.length ? Math.round([...scores.values()].reduce((a, s) => a + s.pct, 0) / listings.length) : 0;

  return (
    <>
      <div className="dash-filters" ref={top}>
        <div className="dash-filters__search">
          <Icon name="search" size={17} />
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, unit number or area" aria-label="Search listings" />
        </div>
        {(devs.length > 0) && (
          <select className="input" value={dev} onChange={(e) => setDev(e.target.value)} aria-label="Development">
            <option value="">All developments</option>
            {devs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {hasStandalone && <option value={STANDALONE}>Standalone only</option>}
          </select>
        )}
        <select className="input" value={deal} onChange={(e) => setDeal(e.target.value)} aria-label="Deal">
          <option value="">Sale &amp; rent</option>
          <option value="sale">{DEAL_LABELS.sale}</option>
          <option value="rent">{DEAL_LABELS.rent}</option>
        </select>
        {types.length > 1 && (
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t as PropertyType]}</option>)}
          </select>
        )}
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="live">Live</option>
          <option value="hidden">Hidden</option>
          <option value="review">Drafts &amp; review</option>
          <option value="expiring">Expiring or expired</option>
          <option value="lowq">Quality under 70%</option>
          {UNIT_STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        {agentName && agents.length > 1 && (
          <select className="input" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Agent">
            <option value="">All agents</option>
            {agents.map((id) => <option key={id} value={id}>{agentName(id)}</option>)}
          </select>
        )}
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="new">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="views">Most viewed</option>
          <option value="unit">Unit number</option>
        </select>
      </div>
      <div className="dash-filters__sum small muted">
        {filtering ? `${shown.length} of ${listings.length} listings` : `${listings.length} listings`}
        {groups.length > 1 && ` in ${groups.length} groups`}
        {filtering && <> · <button type="button" className="link-btn" onClick={reset}>Clear filters</button></>}
        {listings.length > 0 && <> · average quality <b className={`q-txt q-txt--${scoreTone(avg)}`}>{avg}%</b></>}
        {groups.length > 1 && (
          <> · <button type="button" className="link-btn"
            onClick={() => setOpen(Object.fromEntries(groups.map((g) => [g.key, !groups.every(isOpen)])))}>
            {groups.every(isOpen) ? 'Collapse all' : 'Expand all'}</button></>
        )}
      </div>

      {bulk && sel.length > 0 && (
        <BulkBar listings={sel} onClear={() => setPicked(new Set())}
          onDone={(keep) => { if (!keep) setPicked(new Set()); onBulkDone!(); }} />
      )}

      {shown.length === 0 ? (
        <div className="empty"><div className="empty__ico"><Icon name="search" size={40} /></div>
          Nothing matches these filters. <button type="button" className="link-btn" onClick={reset}>Clear filters</button></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                {bulk && (
                  <th className="td--pick">
                    <input type="checkbox" checked={allShown} aria-label={`Select all ${shown.length} shown`}
                      title={`Select all ${shown.length} shown`}
                      onChange={(e) => toggle(shown.map((l) => l.id), e.target.checked)} />
                  </th>
                )}
                <th>Property</th>
                {agentName && <th>Agent</th>}
                <th>Price</th><th>Views</th><th>Status</th><th>Quality</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pages[cur - 1].map(({ g, items, cont }) => {
                const live = g.items.filter((l) => lifecycle(l).key === 'live').length;
                const free = g.items.filter((l) => l.status === 'available').length;
                const expanded = isOpen(g);
                return (
                  <Fragment key={g.key}>
                    {groups.length > 1 || g.key !== STANDALONE ? (
                      <tr className="group-row">
                        <td colSpan={cols}>
                          <button type="button" className="group-row__btn" aria-expanded={expanded}
                            onClick={() => setOpen((o) => ({ ...o, [g.key]: !expanded }))}>
                            <span className={`group-row__chev ${expanded ? 'is-open' : ''}`}><Icon name="chevron" size={16} /></span>
                            <span className="group-row__txt">
                              <b>{g.name}</b>
                              <span className="small muted">
                                {g.items.length} {g.items.length === 1 ? 'listing' : 'listings'} · {live} live
                                {g.key !== STANDALONE && ` · ${free} available`}
                                {cont && ' · continued'}
                              </span>
                            </span>
                          </button>
                          {g.slug && <Link className="small link-accent" href={`/developments/${g.slug}`} target="_blank">Open page</Link>}
                        </td>
                      </tr>
                    ) : null}
                    {expanded && items.map((l) => (
                      <tr key={l.id} className={picked.has(l.id) ? 'is-picked' : undefined}>
                        {bulk && (
                          <td className="td--pick">
                            <input type="checkbox" checked={picked.has(l.id)} aria-label={`Select ${l.title}`}
                              onChange={(e) => toggle([l.id], e.target.checked)} />
                          </td>
                        )}
                        <td data-label="Property">
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Photo className="thumb" src={l.photos[0]} label="" />
                            <div>
                              <Link href={`/listings/${l.id}`} style={{ fontWeight: 600 }}>{l.title}</Link>
                              <div className="tiny muted">
                                {l.unitNo && `Unit ${l.unitNo} · `}{DEAL_LABELS[l.deal]} · {l.neighborhood} · {fmtDate(l.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        {agentName && <td className="small" data-label="Agent">{agentName(l.agentId)}</td>}
                        <td data-label="Price" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtPrice(l.price, l.deal)}</td>
                        <td data-label="Views">{fmtNumber(l.views)}</td>
                        <td data-label="Status">
                          <StatusCell l={l} onRenew={onRenew} onSubmit={onSubmit} />
                        </td>
                        <td data-label="Quality">
                          <QualityCell score={scores.get(l.id)!} onEdit={() => onEdit(l)} />
                        </td>
                        <td className="td--act" style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn--sm btn--ghost btn--icon" title="Edit" aria-label="Edit" onClick={() => onEdit(l)}><Icon name="pencil" size={16} /></button>{' '}
                          {/* чернетку й те, що на перевірці, публікує «Publish» у колонці статусу */}
                          {!['draft', 'pending', 'rejected'].includes(l.review) && (
                            <><button className="btn btn--sm btn--ghost" onClick={() => onToggle(l)}>
                              {l.active ? 'Unpublish' : 'Publish'}
                            </button>{' '}</>
                          )}
                          <button className="btn btn--sm btn--danger btn--icon" title="Delete" aria-label="Delete" onClick={() => onDelete(l)}><Icon name="trash" size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {pageCount > 1 && <Pager page={cur} count={pageCount} onGo={go} />}
        </div>
      )}
    </>
  );
}

/** Стан у життєвому циклі + продаж; під ним — що зробити далі (продовжити, надіслати, примітка модератора) */
function StatusCell({ l, onRenew, onSubmit }: { l: Listing; onRenew?: (l: Listing) => void; onSubmit?: (l: Listing) => void }) {
  const lc = lifecycle(l);
  const tone = lc.key === 'live' ? 'pill--on' : lc.key === 'rejected' || lc.key === 'expired' ? 'pill--warn' : 'pill--off';
  return (
    <div className="lc-cell">
      <div style={{ whiteSpace: 'nowrap' }}>
        <span className={`pill ${tone}`}>{lc.label}</span>
        {l.status !== 'available' && <span className="pill pill--off" style={{ marginLeft: 6 }}>{statusLabel(l.status)}</span>}
      </div>
      {lc.key === 'pending' && <span className="tiny muted">Visible to buyers after a quick check</span>}
      {lc.key === 'rejected' && l.reviewNote && <span className="tiny lc-note">{l.reviewNote}</span>}
      {lc.daysLeft !== null && lc.daysLeft <= 30 && lc.key !== 'expired' && (
        <span className="tiny muted">Expires in {lc.daysLeft} {lc.daysLeft === 1 ? 'day' : 'days'}</span>
      )}
      {lc.canRenew && onRenew && (
        <button type="button" className="link-btn tiny" onClick={() => onRenew(l)}>Renew for 90 days</button>
      )}
      {lc.canSubmit && onSubmit && (
        <button type="button" className="link-btn tiny" onClick={() => onSubmit(l)}>
          {lc.key === 'draft' ? 'Publish' : 'Send for review again'}
        </button>
      )}
    </div>
  );
}

/** Повнота оголошення: відсоток зі смужкою, по кліку — що додати */
function QualityCell({ score, onEdit }: { score: { pct: number; hints: string[] }; onEdit: () => void }) {
  const tone = scoreTone(score.pct);
  const bar = (
    <span className="q-meter" aria-hidden><span className={`q-meter__fill q-meter__fill--${tone}`} style={{ width: `${score.pct}%` }} /></span>
  );
  if (!score.hints.length) return <span className="q-cell">{bar}<b className={`q-txt q-txt--${tone}`}>{score.pct}%</b></span>;
  return (
    <details className="q-cell q-cell--hints">
      <summary title="What to improve">{bar}<b className={`q-txt q-txt--${tone}`}>{score.pct}%</b></summary>
      <div className="q-pop">
        <b className="small">To reach 100%</b>
        <ul>{score.hints.map((h) => <li key={h}>{h}</li>)}</ul>
        <button type="button" className="link-btn small" onClick={onEdit}>Edit listing</button>
      </div>
    </details>
  );
}

/** Номери сторінок: до 7 — усі, далі перша, остання і сусіди поточної, решта — «…» */
function Pager({ page, count, onGo }: { page: number; count: number; onGo: (p: number) => void }) {
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= count; p++) {
    if (count <= 7 || p === 1 || p === count || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pager" aria-label="Pages">
      <button type="button" className="pager__btn" disabled={page === 1} onClick={() => onGo(page - 1)} aria-label="Previous page">‹</button>
      {nums.map((p, i) => p === '…'
        ? <span key={`gap${i}`} className="pager__gap">…</span>
        : <button key={p} type="button" className={`pager__btn ${p === page ? 'is-on' : ''}`}
            aria-current={p === page ? 'page' : undefined} onClick={() => onGo(p)}>{p}</button>)}
      <button type="button" className="pager__btn" disabled={page === count} onClick={() => onGo(page + 1)} aria-label="Next page">›</button>
    </nav>
  );
}
