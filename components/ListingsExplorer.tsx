'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import FiltersModal from './FiltersModal';
import Icon from './Icon';
import ListingCard from './ListingCard';
import type { Pin } from './MapView';
import { toast } from './Toaster';
import { EMPTY_FILTERS, type Filters, countActive, toQuery } from '@/lib/filters';
import { fmtUsd, nListings } from '@/lib/format';
import type { Listing } from '@/lib/types';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="map-skeleton">Loading map…</div>,
});

export default function ListingsExplorer({
  initialItems, initialPins, initialTotal, initialHasMore, initialFilters, favIds, authed,
}: {
  initialItems: Listing[]; initialPins: Pin[]; initialTotal: number; initialHasMore: boolean;
  initialFilters: Filters; favIds: string[]; authed: boolean;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [items, setItems] = useState<Listing[]>(initialItems);
  const [pins, setPins] = useState<Pin[]>(initialPins);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* висота панелі → в CSS, щоб карта займала рівно решту вікна */
  useEffect(() => {
    const el = filtersRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--filters-h', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--filters-h'); };
  }, []);

  const qs = useMemo(() => toQuery(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);

    // список — першою сторінкою, карта — всіма збігами одразу
    Promise.all([
      fetch(`/api/listings?${qs}&page=0`).then((r) => r.json()),
      fetch(`/api/listings?${qs}&mode=pins`).then((r) => r.json()),
    ])
      .then(([list, pinData]) => {
        if (cancelled) return;
        setItems(list.items);
        setTotal(list.total);
        setHasMore(list.hasMore);
        setPins(pinData.pins);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    window.history.replaceState(null, '', `/listings${qs ? `?${qs}` : ''}`);
    return () => { cancelled = true; };
  }, [qs]);

  async function loadMore() {
    setLoadingMore(true);
    const next = page + 1;
    const d = await fetch(`/api/listings?${qs}&page=${next}`).then((r) => r.json());
    setItems((prev) => [...prev, ...d.items]);
    setPage(next);
    setHasMore(d.hasMore);
    setLoadingMore(false);
  }

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  async function saveSearch() {
    if (!authed) return toast('Sign in to save searches');
    const title = [
      filters.deal === 'rent' ? 'Rentals' : 'For sale',
      filters.oceanfront && 'oceanfront',
      filters.beds.length && `${filters.beds.join('/')} bd`,
      filters.neighborhoods[0],
      filters.priceMax && `under ${fmtUsd(Number(filters.priceMax))}`,
    ].filter(Boolean).join(', ');
    const res = await fetch('/api/saved-searches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'All listings', query: qs }),
    });
    toast(res.ok ? 'Search saved to your account' : 'Could not save the search');
    router.refresh();
  }

  const active = countActive(filters);

  return (
    <>
      <div className="filters" ref={filtersRef}>
        <div className="wrap filters__in">
          <input className="input" type="search" placeholder="Search: area, resort, street…"
            value={filters.q} onChange={(e) => set({ q: e.target.value })} style={{ minWidth: 240 }} />

          <select className="input" value={filters.deal} onChange={(e) => set({ deal: e.target.value })}>
            <option value="">Buy or rent</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>

          <select className="input" value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">Any type</option>
            <option value="condo">Condos</option>
            <option value="house">Houses &amp; villas</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
          </select>

          <button className={`btn btn--sm ${filters.oceanfront ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => set({ oceanfront: !filters.oceanfront })}><Icon name="wave" size={17} /> Oceanfront</button>

          <button className="btn btn--sm btn--orange" onClick={() => setModal(true)}>
            <Icon name="sliders" size={17} /> Filters {active > 0 && <span className="f-badge">{active}</span>}
          </button>

          <button className="btn btn--sm" onClick={saveSearch}><Icon name="bookmark" size={17} /> Save search</button>

          {active > 0 && (
            <button className="btn btn--sm btn--ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, deal: filters.deal })}>Reset all</button>
          )}

          <span className="filters__count">{loading ? 'Searching…' : nListings(total)}</span>
        </div>
      </div>

      <div className="split">
        <div className="split__list">
          <div className="list-head">
            <h1>{loading ? 'Searching…' : `${nListings(total)} on Roatán`}</h1>
            <span className="muted small">Bay Islands, Honduras</span>
          </div>

          {total === 0 && !loading ? (
            <div className="empty"><div className="empty__ico"><Icon name="island" size={40} /></div>Nothing matches these filters. Try widening the price range.</div>
          ) : (
            <div className="grid grid--list">
              {items.map((l) => (
                <div key={l.id} id={`card-${l.id}`}>
                  <ListingCard
                    listing={l}
                    isFav={favIds.includes(l.id)}
                    highlighted={activeId === l.id}
                    onMouseEnter={() => setActiveId(l.id)}
                    onMouseLeave={() => setActiveId(null)}
                  />
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div style={{ display: 'grid', placeItems: 'center', padding: '22px 0 6px' }}>
              <button className="btn btn--ghost btn--lg" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Show more — ${total - items.length} left`}
              </button>
            </div>
          )}
        </div>

        <div className="split__map">
          <MapView items={pins} activeId={activeId} onSelect={onSelect} onHover={setActiveId} />
        </div>
      </div>

      <FiltersModal
        open={modal}
        filters={filters}
        onClose={() => setModal(false)}
        onApply={(f) => setFilters(f)}
      />
    </>
  );
}
