'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import FiltersModal from './FiltersModal';
import Icon from './Icon';
import ListingCard from './ListingCard';
import { RoomPriceStats } from './PriceStats';
import type { Pin } from './MapView';
import { toast } from './Toaster';
import {
  type Bbox, EMPTY_FILTERS, type Filters, countActive, formatBbox, fromParams, parseBbox, toQuery,
} from '@/lib/filters';
import { fmtNumber, fmtUsd, nListings } from '@/lib/format';
import type { RoomStat } from '@/lib/priceStats';
import type { Listing } from '@/lib/types';
import { useLang, useT } from './LangProvider';

function MapLoading() {
  const t = useT();
  return <div className="map-skeleton">{t('Loading map…')}</div>;
}

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function ListingsExplorer({
  initialItems, initialPins, initialTotal, initialHasMore, initialFilters, favIds, authed, roomStats = [],
}: {
  initialItems: Listing[]; initialPins: Pin[]; initialTotal: number; initialHasMore: boolean;
  initialFilters: Filters; favIds: string[]; authed: boolean; roomStats?: RoomStat[];
}) {
  const t = useT();
  const lang = useLang();
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
  // межі, куди користувач посунув карту після останнього пошуку — тоді й зʼявляється «Search this area»
  const [movedTo, setMovedTo] = useState<Bbox | null>(null);
  // на вузьких екранах показуємо щось одне: список або карту
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // у режимі карти сторінка не має прокручуватись — інакше з-під карти визирає футер
  useEffect(() => {
    if (mobileView !== 'map') return;
    window.scrollTo(0, 0);
    document.body.dataset.mapView = '1';
    return () => { delete document.body.dataset.mapView; };
  }, [mobileView]);
  const filtersRef = useRef<HTMLDivElement>(null);

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
  const area = useMemo(() => parseBbox(filters.bbox) ?? null, [filters.bbox]);

  // Що вже завантажено: стартове значення — запит, який віддав сервер, тож на
  // монтуванні той самий список не тягнеться вдруге (і StrictMode це не ламає).
  const fetchedQs = useRef(toQuery(initialFilters));

  /*
   * Перемикання Buy / Rent / Land — навігація в межах того самого маршруту:
   * Next лишає компонент змонтованим, тож його стан переживає перехід і на
   * екрані лишається попередній розділ. Стежимо за адресою (useSearchParams
   * бачить і наш власний replaceState) і на чужу зміну приймаємо те, що для
   * цієї адреси віддав сервер.
   */
  const urlQs = toQuery(fromParams(Object.fromEntries(useSearchParams().entries())));
  // остання адреса, яку записали ми самі — щоб не приймати свій же фільтр за навігацію
  const ownQs = useRef(toQuery(initialFilters));

  useEffect(() => {
    if (urlQs === ownQs.current) return;

    const incoming = toQuery(initialFilters);
    ownQs.current = incoming;
    fetchedQs.current = incoming;
    setFilters(initialFilters);
    setItems(initialItems);
    setPins(initialPins);
    setTotal(initialTotal);
    setHasMore(initialHasMore);
    setPage(0);
    setActiveId(null);
    setMovedTo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQs]);

  useEffect(() => {
    if (fetchedQs.current === qs) return;
    fetchedQs.current = qs;

    let cancelled = false;
    setLoading(true);
    setPage(0);
    // нова вибірка переставить карту сама — стара пропозиція шукати тут уже ні до чого
    setMovedTo(null);

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

    ownQs.current = qs;
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
    if (!authed) return toast(t('Sign in to save searches'));
    const title = [
      filters.deal === 'rent' ? t('Rentals') : t('For sale'),
      filters.oceanfront && t('oceanfront'),
      filters.beds.length && t('{n} bd', { n: filters.beds.join('/') }),
      filters.neighborhoods[0],
      filters.priceMax && t('under {price}', { price: fmtUsd(Number(filters.priceMax)) }),
    ].filter(Boolean).join(', ');
    const res = await fetch('/api/saved-searches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || t('All listings'), query: qs }),
    });
    toast(res.ok ? t('Search saved to your account') : t('Could not save the search'));
  }

  const searchArea = () => {
    if (!movedTo) return;
    set({ bbox: formatBbox(movedTo) });
    setMovedTo(null);
  };

  const active = countActive(filters);

  return (
    <>
      <div className="filters" ref={filtersRef}>
        <div className="wrap filters__in">
          <input className="input filters__q" type="search" placeholder={t('Search: area, resort, street…')}
            value={filters.q} onChange={(e) => set({ q: e.target.value })} />

          <select className="input filters__type" value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">{t('Any type')}</option>
            <option value="condo">{t('Condos')}</option>
            <option value="house">{t('Houses & villas')}</option>
            <option value="land">{t('Land')}</option>
            <option value="commercial">{t('Commercial')}</option>
          </select>

          {/* Oceanfront і Reset живуть ще й у модалці фільтрів, тож на телефоні
              ховаємо їх, щоб панель влазила у ширину без бокової прокрутки. */}
          <button className={`btn btn--sm filters__ocean ${filters.oceanfront ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => set({ oceanfront: !filters.oceanfront })}><Icon name="wave" size={17} /> {t('Oceanfront')}</button>

          {/* лише в режимі Land: титул + дорога + світло + вода на місці */}
          {filters.type === 'land' && (
            <button className={`btn btn--sm filters__ocean ${filters.ready ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => set({ ready: !filters.ready })}><Icon name="check" size={17} /> {t('Ready to build')}</button>
          )}

          <button className="btn btn--sm btn--orange filters__more" onClick={() => setModal(true)}>
            <Icon name="sliders" size={17} /> {t('Filters')} {active > 0 && <span className="f-badge">{active}</span>}
          </button>

          <button className="btn btn--sm filters__save" onClick={saveSearch} aria-label={t('Save search')}>
            <Icon name="bookmark" size={17} /> <span className="btn__t">{t('Save search')}</span>
          </button>

          {filters.bbox && (
            <button className="btn btn--sm btn--primary filters__area" onClick={() => set({ bbox: '' })}
              aria-label={t('Clear map area')}>
              <Icon name="map" size={17} /> <span className="btn__t">{t('Map area')}</span> <Icon name="close" size={15} />
            </button>
          )}

          {active > 0 && (
            <button className="btn btn--sm btn--ghost filters__reset"
              onClick={() => setFilters({ ...EMPTY_FILTERS, deal: filters.deal })}>{t('Reset all')}</button>
          )}

          <span className="filters__count">{loading ? t('Searching…') : nListings(total, lang)}</span>
        </div>
      </div>

      <div className={`split split--${mobileView}`}>
        <div className="split__list">
          <div className="list-head">
            <h1>
              {loading
                ? t('Searching…')
                : filters.deal === 'rent'
                  ? t('{n} for rent on Roatán', { n: fmtNumber(total) })
                  : filters.deal === 'sale'
                    ? t('{n} for sale on Roatán', { n: fmtNumber(total) })
                    : t('{listings} on Roatán', { listings: nListings(total, lang) })}
            </h1>
            <span className="muted small">{t('Bay Islands, Honduras')}</span>
          </div>

          {(filters.deal === 'sale' || filters.deal === 'rent') && (
            <RoomPriceStats deal={filters.deal} stats={roomStats} onPick={(beds) => set({ beds })} />
          )}

          {total === 0 && !loading ? (
            <div className="empty">
              <div className="empty__ico"><Icon name="island" size={40} /></div>
              {filters.bbox
                ? t('Nothing in this part of the map. Zoom out or move the map, then search again.')
                : active > 0
                ? t('Nothing matches these filters. Drop one of them and try again.')
                : filters.deal === 'rent'
                  ? t('Nothing on Roatán for rent in this section yet.')
                  : t('Nothing on Roatán for sale in this section yet.')}
            </div>
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
            <div style={{ display: 'grid', placeItems: 'center', padding: '24px 0 6px' }}>
              <button className="btn btn--ghost btn--lg" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t('Loading…') : t('Show more — {n} left', { n: total - items.length })}
              </button>
            </div>
          )}
        </div>

        <div className="split__map">
          <MapView items={pins} activeId={activeId} onSelect={onSelect} onHover={setActiveId}
            area={area} onMoved={setMovedTo} />
          {movedTo && (
            <button className="btn btn--sm map-area-btn" onClick={searchArea} disabled={loading}>
              <Icon name="search" size={16} /> {t('Search this area')}
            </button>
          )}
        </div>
      </div>

      <button
        className="view-toggle"
        onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
        aria-label={mobileView === 'list' ? t('Show map') : t('Show list')}
      >
        {mobileView === 'list' ? t('Map') : t('List')}
        <Icon name={mobileView === 'list' ? 'map' : 'list'} size={18} />
      </button>

      <FiltersModal
        open={modal}
        filters={filters}
        onClose={() => setModal(false)}
        onApply={(f) => setFilters(f)}
      />
    </>
  );
}
