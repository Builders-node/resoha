'use client';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import Icon from './Icon';
import Photo from './Photo';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPrice } from '@/lib/format';
import { UNIT_STATUSES, statusLabel } from '@/lib/units';
import type { Listing, PropertyType } from '@/lib/types';

type Sort = 'new' | 'price_asc' | 'price_desc' | 'views' | 'unit';
type Group = { key: string; name: string; slug: string | null; items: Listing[] };

const STANDALONE = 'standalone';
// Великі ЖК згорнуті, поки нічого не шукають: інакше 30 однакових квартир ховають решту
const COLLAPSE_OVER = 8;

/**
 * Таблиця оголошень у кабінеті: фільтри зверху, квартири згруповані за ЖК.
 * Фільтрує на клієнті — кабінет і так вантажить усі оголошення ріелтора чи агенції.
 */
export default function DashboardListings({ listings, agentName, onEdit, onToggle, onDelete }: {
  listings: Listing[];
  /** Є лише в режимі «вся агенція» — тоді показуємо колонку й фільтр «Agent» */
  agentName?: (id: string) => string;
  onEdit: (l: Listing) => void;
  onToggle: (l: Listing) => void;
  onDelete: (l: Listing) => void;
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
      if (status === 'live' && !l.active) return false;
      if (status === 'hidden' && l.active) return false;
      if (status && status !== 'live' && status !== 'hidden' && l.status !== status) return false;
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
  }, [listings, q, dev, deal, type, status, agent, sort]);

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

  function reset() {
    setQ(''); setDev(''); setDeal(''); setType(''); setStatus(''); setAgent('');
  }

  const cols = agentName ? 6 : 5;

  return (
    <>
      <div className="dash-filters">
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
        {groups.length > 1 && (
          <> · <button type="button" className="link-btn"
            onClick={() => setOpen(Object.fromEntries(groups.map((g) => [g.key, !groups.every(isOpen)])))}>
            {groups.every(isOpen) ? 'Collapse all' : 'Expand all'}</button></>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="empty"><div className="empty__ico"><Icon name="search" size={40} /></div>
          Nothing matches these filters. <button type="button" className="link-btn" onClick={reset}>Clear filters</button></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Property</th>
                {agentName && <th>Agent</th>}
                <th>Price</th><th>Views</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const live = g.items.filter((l) => l.active).length;
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
                              </span>
                            </span>
                          </button>
                          {g.slug && <Link className="small link-accent" href={`/developments/${g.slug}`} target="_blank">Open page</Link>}
                        </td>
                      </tr>
                    ) : null}
                    {expanded && g.items.map((l) => (
                      <tr key={l.id}>
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
                        <td data-label="Status" style={{ whiteSpace: 'nowrap' }}>
                          <span className={`pill ${l.active ? 'pill--on' : 'pill--off'}`}>{l.active ? 'Live' : 'Hidden'}</span>
                          {l.status !== 'available' && <span className="pill pill--off" style={{ marginLeft: 6 }}>{statusLabel(l.status)}</span>}
                        </td>
                        <td className="td--act" style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn--sm btn--ghost btn--icon" title="Edit" aria-label="Edit" onClick={() => onEdit(l)}><Icon name="pencil" size={16} /></button>{' '}
                          <button className="btn btn--sm btn--ghost" onClick={() => onToggle(l)}>
                            {l.active ? 'Unpublish' : 'Publish'}
                          </button>{' '}
                          <button className="btn btn--sm btn--danger btn--icon" title="Delete" aria-label="Delete" onClick={() => onDelete(l)}><Icon name="trash" size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
