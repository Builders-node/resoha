'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import Photo from './Photo';
import { toast } from './Toaster';
import { DEAL_LABELS, fmtNumber, fmtPrice } from '@/lib/format';
import { stageLabel } from '@/lib/units';
import type { Building, Development, Listing } from '@/lib/types';

type Kind = 'development' | 'building' | 'listing';
type AdminDevelopment = Development & { buildings: Building[]; units: number };

/** Один рядок у будь-якому списку: ЖК, дім або оголошення зведені до спільного вигляду. */
type Item = {
  kind: Kind; id: string; name: string; meta: string; photo: string; href: string;
  featured: boolean; rank: number; hidden: boolean;
};

const GROUPS: { kind: Kind; title: string; empty: string }[] = [
  { kind: 'development', title: 'Developments', empty: 'No development is featured yet.' },
  { kind: 'building', title: 'Buildings', empty: 'No building is featured yet.' },
  { kind: 'listing', title: 'Listings', empty: 'No listing is featured yet.' },
];
const KIND_LABEL: Record<Kind, string> = { development: 'Development', building: 'Building', listing: 'Listing' };

const byRank = (a: Item, b: Item) => a.rank - b.rank || a.name.localeCompare(b.name);

/** Зірка: залита — на головній, контур — ні. Один клік перемикає. */
export function StarButton({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  const title = on ? 'Remove from the home page' : 'Feature on the home page';
  return (
    <button type="button" className={`btn btn--sm btn--ghost btn--icon star-btn ${on ? 'is-on' : ''}`}
      title={title} aria-label={label ? `${title}: ${label}` : title} aria-pressed={on} onClick={onClick}>
      <Icon name="star" size={16} />
    </button>
  );
}

/**
 * Вкладки адмінки «Featured» (що зараз на головній і в якому порядку + швидкий пошук, щоб додати)
 * і «Developments» (усі ЖК з домами, зірка біля кожного).
 */
export default function FeaturedAdmin({ mode }: { mode: 'featured' | 'developments' }) {
  const [devs, setDevs] = useState<AdminDevelopment[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');

  const load = useCallback(async () => {
    const d = await fetch('/api/admin?section=featured').then((r) => r.json()).catch(() => ({}));
    setDevs(d.developments ?? []);
    setListings(d.listings ?? []);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    devs.forEach((d) => {
      out.push({
        kind: 'development', id: d.id, name: d.name, photo: d.photos[0] ?? '', href: `/developments/${d.slug}`,
        meta: [d.developer, d.neighborhood, `${d.units} units`].filter(Boolean).join(' · '),
        featured: d.featured, rank: d.featuredRank, hidden: !d.active,
      });
      d.buildings.forEach((b) => out.push({
        kind: 'building', id: b.id, name: b.name, photo: b.photo || d.photos[0] || '', href: `/developments/${d.slug}/layouts`,
        meta: [d.name, stageLabel(b.stage), b.completion].filter(Boolean).join(' · '),
        featured: b.featured, rank: b.featuredRank, hidden: !d.active,
      }));
    });
    listings.forEach((l) => out.push({
      kind: 'listing', id: l.id, name: l.title, photo: l.photos[0] ?? '', href: `/listings/${l.id}`,
      meta: `${DEAL_LABELS[l.deal]} · ${l.neighborhood} · ${fmtPrice(l.price, l.deal)}`,
      featured: l.featured, rank: l.featuredRank, hidden: !l.active,
    }));
    return out;
  }, [devs, listings]);

  /** Оптимістично: зірка міняється одразу, сервер наздоганяє. */
  function patchLocal(k: Kind, id: string, featured: boolean, rank?: number) {
    const set = <T extends { id: string; featured: boolean; featuredRank: number }>(x: T): T =>
      x.id === id ? { ...x, featured, featuredRank: rank ?? x.featuredRank } : x;
    if (k === 'listing') setListings((ls) => ls.map(set));
    else if (k === 'development') setDevs((ds) => ds.map(set));
    else setDevs((ds) => ds.map((d) => ({ ...d, buildings: d.buildings.map(set) })));
  }

  async function toggle(it: Item) {
    const next = !it.featured;
    const last = Math.max(0, ...items.filter((x) => x.kind === it.kind && x.featured).map((x) => x.rank));
    patchLocal(it.kind, it.id, next, next ? last + 1 : undefined);
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: it.kind, id: it.id, featured: next, targetName: it.name }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast(d.error ?? 'Not allowed'); load(); return; }
    toast(next ? `${KIND_LABEL[it.kind]} featured on the home page` : 'Removed from the home page');
  }

  async function move(group: Item[], index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= group.length) return;
    const order = [...group];
    [order[index], order[to]] = [order[to], order[index]];
    order.forEach((it, i) => patchLocal(it.kind, it.id, true, i + 1));
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: group[0].kind, ids: order.map((it) => it.id) }),
    });
    if (!res.ok) { toast('Could not save the order'); load(); }
  }

  const row = (it: Item, extra?: React.ReactNode) => (
    <div key={`${it.kind}:${it.id}`} className={`feat-row ${it.kind === 'building' && mode === 'developments' ? 'feat-row--sub' : ''}`}>
      <Photo className="thumb" src={it.photo} label="" />
      <div className="feat-row__b">
        <Link href={it.href} target="_blank" className="feat-row__name">{it.name}</Link>
        <div className="tiny muted">
          {it.meta}
          {it.hidden && <span className="pill pill--off" style={{ marginLeft: 6 }}>Hidden</span>}
        </div>
      </div>
      <div className="feat-row__act">
        {extra}
        <StarButton on={it.featured} label={it.name} onClick={() => toggle(it)} />
      </div>
    </div>
  );

  if (busy) return <div className="panel">Loading…</div>;

  if (mode === 'developments') {
    const term = q.trim().toLowerCase();
    const shown = devs.filter((d) => !term
      || [d.name, d.developer, d.neighborhood, ...d.buildings.map((b) => b.name)].some((s) => s.toLowerCase().includes(term)));
    const itemOf = (k: Kind, id: string) => items.find((x) => x.kind === k && x.id === id)!;
    return (
      <div className="panel">
        <div className="fgroup__head"><h3>Developments</h3></div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Every development and its buildings. Tap the star to put one on the home page; the order is set on the Featured tab.
        </p>
        <div className="adm-bar">
          <input className="input" type="search" value={q} placeholder="Search by development, developer, area or building…"
            onChange={(e) => setQ(e.target.value)} />
          <span className="muted small">{fmtNumber(shown.length)} of {fmtNumber(devs.length)}</span>
        </div>
        {shown.length === 0 ? <p className="muted small">Nothing matches this search.</p> : (
          <div className="feat-list">
            {shown.map((d) => (
              <div key={d.id} className="feat-dev">
                {row(itemOf('development', d.id))}
                {d.buildings.map((b) => row(itemOf('building', b.id)))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Featured: три впорядковані групи + пошук, щоб додати нове
  const term = q.trim().toLowerCase();
  const candidates = term.length < 2 ? [] : items
    .filter((it) => !it.featured && (kind === 'all' || it.kind === kind))
    .filter((it) => it.name.toLowerCase().includes(term) || it.meta.toLowerCase().includes(term))
    .slice(0, 12);

  return (
    <>
      <div className="panel">
        <div className="fgroup__head"><h3>Add to the home page</h3></div>
        <div className="adm-bar">
          <input className="input" type="search" value={q} placeholder="Find a development, building or listing…"
            onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="all">Everything</option>
            <option value="development">Developments</option>
            <option value="building">Buildings</option>
            <option value="listing">Listings</option>
          </select>
        </div>
        {term.length >= 2 && (candidates.length === 0
          ? <p className="muted small">Nothing to add matches this search.</p>
          : <div className="feat-list">{candidates.map((it) => row(it, <span className="pill pill--off">{KIND_LABEL[it.kind]}</span>))}</div>)}
      </div>

      {GROUPS.map((g) => {
        const group = items.filter((it) => it.kind === g.kind && it.featured).sort(byRank);
        return (
          <div key={g.kind} className="panel">
            <div className="fgroup__head">
              <h3>{g.title} on the home page</h3>
              <span className="muted small">{group.length}</span>
            </div>
            {group.length === 0 ? <p className="muted small">{g.empty} Use the search above or the star on any row.</p> : (
              <div className="feat-list">
                {group.map((it, i) => row(it, (
                  <>
                    <span className="feat-row__no">{i + 1}</span>
                    <button type="button" className="btn btn--sm btn--ghost btn--icon" title="Move up" aria-label="Move up"
                      disabled={i === 0} onClick={() => move(group, i, -1)}><Icon name="arrowUp" size={16} /></button>
                    <button type="button" className="btn btn--sm btn--ghost btn--icon" title="Move down" aria-label="Move down"
                      disabled={i === group.length - 1} onClick={() => move(group, i, 1)}><Icon name="arrowDown" size={16} /></button>
                  </>
                )))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
