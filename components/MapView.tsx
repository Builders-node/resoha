'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GeoJSONSource, Map as MLMap, Marker, Popup } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Bbox } from '@/lib/filters';
import { DEAL_LABELS, photoUrl, specLine } from '@/lib/format';
import { fmtDistance, listingFootprint, pathLength } from '@/lib/mapGeo';
import { BUILDINGS_LAYER, FILL_LAYERS, SATELLITE_LAYER, mapStyle } from '@/lib/mapStyle';
import { categoryLabel, type NearbyPlace } from '@/lib/nearby';
import type { Deal, Listing, PropertyType } from '@/lib/types';
import type { Lang, T } from '@/lib/i18n';
import { useLang, useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
import type { Money } from '@/lib/currency';
import { localePath } from '@/lib/i18n/paths';

/** Карті потрібні лише координати й ціна — картку вона підвантажує окремо. */
export type Pin = {
  id: string; lat: number; lng: number; price: number; deal: Deal; type?: PropertyType;
  /** напис на піні замість ціни (напр. назва ЖК без цін) */
  label?: string;
  /** готова картка для попапа — тоді нічого не підвантажуємо (ЖК на сторінці новобудов) */
  card?: PinCard;
};

/** Дані міні-картки, коли пін — не оголошення. */
export type PinCard = { href: string; title: string; meta: string; price: string; photo?: string; badge?: string };

type Props = {
  items: Pin[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  /**
   * Сторінка обʼєкта: нахилена 3D-карта, будинки обʼєкта підсвічені помаранчевим,
   * навколо них — ділянка, над ними — цінник.
   */
  detail?: boolean;
  /** активний пошук по області: карта стоїть на цих межах, а не підганяється під піни */
  area?: Bbox | null;
  /** користувач посунув або наблизив карту — межі нового виду */
  onMoved?: (bounds: Bbox) => void;
  /** користувач знову почав рухати карту — відкладений пошук по області ще рано слати */
  onMoveStart?: () => void;
  /** сторінка обʼєкта: місця поблизости, яким ріелтор поставив точку */
  places?: NearbyPlace[];
};

const ORANGE = '#ff6a2b';
/** Висота умовного будинку, коли OSM його не знає; земля — лише ділянка. */
const FALLBACK_HEIGHT: Record<PropertyType, number> = { condo: 12, commercial: 9, house: 6, land: 0 };
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Скелет картки: показуємо одразу, поки вантажиться сам обʼєкт. */
function skeletonNode(pin: Pin, t: T, lang: Lang, money: Money) {
  const node = document.createElement('div');
  node.className = 'map-pop map-pop--loading';
  node.innerHTML = `<div class="map-pop__b"><div class="map-pop__price">${money.price(pin.price, pin.deal, lang)}</div>
    <div class="map-pop__meta">${t('Loading…')}</div></div>`;
  return node;
}

/** Міні-картка, що зʼявляється прямо на карті при наведенні на цінник. */
function buildPopupNode(l: Listing, onClick: () => void, t: T, lang: Lang, money: Money) {
  const node = document.createElement('div');
  node.className = 'map-pop';
  const photo = photoUrl(l.photos[0]);
  node.innerHTML = `
    ${photo
      ? `<img src="${photo}" alt="" loading="lazy">`
      : `<span class="nophoto"><em>${t('No photo yet')}</em></span>`}
    <span class="badge ${l.deal === 'rent' ? 'badge--accent' : 'badge--brand'}">${t(DEAL_LABELS[l.deal])}</span>
    ${l.oceanfront ? `<span class="badge map-pop__ocean">${t('Oceanfront')}</span>` : ''}
    <div class="map-pop__b">
      <div class="map-pop__title">${l.title}</div>
      <div class="map-pop__meta">${l.neighborhood} · ${specLine(l, lang)}</div>
      <div class="map-pop__price">${money.price(l.price, l.deal, lang)}</div>
    </div>`;
  node.addEventListener('click', onClick);
  return node;
}

/** Міні-картка з готових даних (ЖК): той самий вигляд, що й у оголошення. */
function buildCardNode(c: PinCard, onClick: () => void, t: T) {
  const node = document.createElement('div');
  node.className = 'map-pop';
  const photo = c.photo ? photoUrl(c.photo) : '';
  const esc = (v: string) => v.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  node.innerHTML = `
    ${photo
      ? `<img src="${esc(photo)}" alt="" loading="lazy">`
      : `<span class="nophoto"><em>${t('No photo yet')}</em></span>`}
    ${c.badge ? `<span class="badge badge--brand">${esc(c.badge)}</span>` : ''}
    <div class="map-pop__b">
      <div class="map-pop__title">${esc(c.title)}</div>
      <div class="map-pop__meta">${esc(c.meta)}</div>
      ${c.price ? `<div class="map-pop__price">${esc(c.price)}</div>` : ''}
    </div>`;
  node.addEventListener('click', onClick);
  return node;
}

/** Додаткові джерела й шари поверх базового стилю: обʼєкт, ділянка, лінійка. */
function addOverlays(m: MLMap) {
  m.addSource('plot', { type: 'geojson', data: EMPTY });
  m.addSource('hl', { type: 'geojson', data: EMPTY });
  m.addSource('ruler', { type: 'geojson', data: EMPTY });
  m.addSource('glow', { type: 'geojson', data: EMPTY });
  // ділянку кладемо під будинки, але над дорогами
  m.addLayer({ id: 'plot-fill', type: 'fill', source: 'plot', paint: { 'fill-color': ORANGE, 'fill-opacity': 0.16 } }, 'building-flat');
  m.addLayer({ id: 'plot-line', type: 'line', source: 'plot', paint: { 'line-color': ORANGE, 'line-opacity': 0.35, 'line-width': 1.5 } }, 'building-flat');
  // помаранчеве сяйво під кожним обʼєктом — видно ще здалеку, поки будинків не розгледіти
  m.addLayer({
    id: 'glow', type: 'circle', source: 'glow', maxzoom: 16.5,
    paint: {
      'circle-color': ORANGE,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 20, 15, 34],
      'circle-blur': 0.55,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 0.4, 16.5, 0],
    },
  }, 'building-flat');
  // з 13-го зуму будинки обʼєктів уже залиті помаранчевим, з 15-го — обʼємні
  m.addLayer({
    id: 'hl-flat', type: 'fill', source: 'hl', maxzoom: 15,
    paint: { 'fill-color': ORANGE, 'fill-outline-color': '#e0541a' },
  }, 'housenumber');
  m.addLayer({
    id: 'hl-3d', type: 'fill-extrusion', source: 'hl', minzoom: 15,
    paint: {
      'fill-extrusion-color': ORANGE,
      'fill-extrusion-height': ['get', 'render_height'],
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  }, 'housenumber');
  m.addLayer({
    id: 'ruler-line', type: 'line', source: 'ruler', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0f0f10', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
  });
  m.addLayer({
    id: 'ruler-pt', type: 'circle', source: 'ruler', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#0f0f10', 'circle-stroke-width': 2 },
  });
}

export default function MapView({
  items, activeId, onSelect, onHover, area, onMoved, onMoveStart, center = [16.36, -86.45], zoom = 11,
  interactive = true, detail = false, places,
}: Props) {
  const t = useT();
  const lang = useLang();
  const money = useMoney();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const popups = useRef<Record<string, Popup>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Record<string, Listing>>({});
  // усе, що зараз на карті: цінники (`p:id`) і кластери (`c:id,id…`)
  const shown = useRef(new Map<string, Marker>());
  // для чого ці маркери будували: інша вибірка, мова чи валюта — будуємо заново
  const built = useRef<{ items: Pin[]; lang: Lang; money: Money } | null>(null);
  // підганяння меж під поточні піни; викликаємо, коли карта вперше отримала розмір
  const refit = useRef<(() => void) | null>(null);
  const lastSize = useRef({ w: 0, h: 0 });
  const [viewTick, setViewTick] = useState(0);
  // вибірка, під яку карту вже підігнали: перегрупування після зуму її не міняє
  const fittedFor = useRef<Pin[] | null>(null);
  // >0, поки карту рухаємо ми самі — такі moveend не мають показувати «Search this area»
  const quiet = useRef(0);
  const quietly = (fn: () => void) => {
    quiet.current++;
    try { fn(); } finally { quiet.current--; }
  };
  // колбеки тримаємо у рефах, щоб не перестворювати карту на кожен рендер батька;
  // писати в них треба в ефекті — під час рендера React це забороняє
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const onMovedRef = useRef(onMoved);
  const onMoveStartRef = useRef(onMoveStart);
  const areaRef = useRef(area);
  const activeIdRef = useRef(activeId);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onMovedRef.current = onMoved; }, [onMoved]);
  useEffect(() => { onMoveStartRef.current = onMoveStart; }, [onMoveStart]);
  useEffect(() => { areaRef.current = area; }, [area]);

  const [ready, setReady] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [satellite, setSatellite] = useState(false);
  const [ruler, setRuler] = useState(false);
  const [rulerPts, setRulerPts] = useState<[number, number][]>([]);
  const rulerRef = useRef(false);
  const locMarker = useRef<Marker | null>(null);
  const placeMarkers = useRef<Marker[]>([]);
  // лише ті, що мають точку; памʼятаємо за вмістом, щоб не перемальовувати на кожен рендер
  const pinned = (places ?? []).filter((p) => p.lat !== null && p.lng !== null);
  const pinnedKey = JSON.stringify(pinned);
  const router = useRouter();

  /* --- ініціалізація --- */
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;

    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current || map.current) return;
      lib.current = ml;

      const m = new ml.Map({
        container: el.current,
        style: mapStyle,
        center: [center[1], center[0]],
        zoom: detail ? 17.6 : zoom,
        pitch: detail ? 52 : 0,
        bearing: detail ? -18 : 0,
        maxPitch: 70,
        interactive,
        // на сторінці обʼєкта колесо гортає сторінку, а не карту
        scrollZoom: interactive && !detail,
        attributionControl: { compact: true },
      });
      // у спрайті є не всі іконки POI — підставляємо порожню, щоб не сипались попередження
      m.on('styleimagemissing', (e) => {
        if (!m.hasImage(e.id)) m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });
      m.on('load', () => {
        addOverlays(m);
        setReady(true);
      });

      // перегруповуємо й домальовуємо маркери, коли карта зупинилась.
      // m.resize() у ефекті маркерів теж шле moveend, хоч вид не змінився, — без
      // перевірки виду це нескінченний цикл рендерів, що вішає сторінку
      let lastView = '';
      m.on('moveend', () => {
        const c = m.getCenter();
        const { clientWidth: w, clientHeight: h } = m.getContainer();
        const view = `${w}x${h}|${m.getZoom()}|${c.lng},${c.lat}`;
        if (view !== lastView) { lastView = view; setViewTick((t) => t + 1); }
        if (quiet.current) return;
        const b = m.getBounds();
        onMovedRef.current?.([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
      });
      // лише рух від людини (колесо, жест, «+»): наш resize і fitBounds originalEvent не мають
      m.on('movestart', (e) => { if (e.originalEvent) onMoveStartRef.current?.(); });
      m.on('rotate', () => setBearing(m.getBearing()));
      m.on('click', (e) => {
        if (!rulerRef.current) return;
        setRulerPts((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
      });
      map.current = m;
      ro = new ResizeObserver((entries) => {
        const box = entries[0].contentRect;
        // контейнер був прихований (0×0) і щойно зʼявився — межі рахувались по нулю,
        // тож після resize повертаємо їх на місце
        const wasHidden = lastSize.current.w === 0 || lastSize.current.h === 0;
        lastSize.current = { w: box.width, h: box.height };
        quietly(() => m.resize());
        if (wasHidden && box.width > 0 && box.height > 0) refit.current?.();
      });
      ro.observe(el.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      markers.current = {};
      popups.current = {};
      shown.current = new Map();
      built.current = null;
      fittedFor.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Групуємо піни, що злипаються на екрані: сітка 64px у поточному масштабі.
   * Сітка привʼязана до світу, а не до екрана, — тож при зсуві карти групи не міняються.
   */
  const clusterize = (ml: typeof import('maplibre-gl'), m: MLMap, pins: Pin[]) => {
    const CELL = 64;
    const world = 512 * 2 ** m.getZoom();
    const cells = new Map<string, Pin[]>();
    pins.forEach((p) => {
      const { x, y } = ml.MercatorCoordinate.fromLngLat([p.lng, p.lat]);
      const key = `${Math.floor((x * world) / CELL)}:${Math.floor((y * world) / CELL)}`;
      const cell = cells.get(key);
      if (cell) cell.push(p); else cells.set(key, [p]);
    });
    return [...cells.values()].map((ps) => ({
      pins: ps,
      lat: ps.reduce((s2, p) => s2 + p.lat, 0) / ps.length,
      lng: ps.reduce((s2, p) => s2 + p.lng, 0) / ps.length,
    }));
  };

  /*
   * --- маркери + hover-картка ---
   * Маркери — це DOM-елементи, і MapLibre рухає кожен на кожному кадрі зуму.
   * Тому тримаємо на карті лише ті, що біля видимої області, а після зупинки
   * карти лише доставляємо нові й прибираємо зайві, не перебудовуючи решту.
   */
  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ready || !ml || !m) return;

    const boundsOf = (pins: { lat: number; lng: number }[]) => {
      const b = new ml.LngLatBounds();
      pins.forEach((p) => b.extend([p.lng, p.lat]));
      return b;
    };

    const b0 = built.current;
    if (!b0 || b0.items !== items || b0.lang !== lang || b0.money !== money) {
      shown.current.forEach((mk) => mk.remove());
      Object.values(popups.current).forEach((p) => p.remove());
      shown.current.clear();
      markers.current = {};
      popups.current = {};
      built.current = { items, lang, money };
      (m.getSource('glow') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: items.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
      });
    }

    const fitToItems = (first: boolean) => quietly(() => {
      if (detail && items[0]) {
        if (pinned.length) {
          // є місця поблизости — показуємо їх разом з обʼєктом, але не відлітаємо далеко
          m.fitBounds(boundsOf([items[0], ...pinned.map((p) => ({ lat: p.lat!, lng: p.lng! }))]),
            { padding: 70, maxZoom: 17, animate: false });
          return;
        }
        m.jumpTo({ center: [items[0].lng, items[0].lat] });
        return;
      }
      const a = areaRef.current;
      if (a) {
        // пошук по області: карта лишається там, де її поставили; підганяємо
        // лише коли вид цю область не вміщає (відкрили посилання з bbox)
        // запас 0.0001° — область з посунутої карти округлена до 4 знаків і може
        // вилазити за вид на волосину; через це карта не має смикатись після кожного руху
        const E = 0.0001;
        const v = m.getBounds();
        const fits = a[0] >= v.getSouth() - E && a[1] >= v.getWest() - E && a[2] <= v.getNorth() + E && a[3] <= v.getEast() + E;
        if (first || !fits) m.fitBounds(new ml.LngLatBounds([a[1], a[0]], [a[3], a[2]]), { animate: false });
        return;
      }
      if (!items.length) return;
      if (items.length > 1) {
        // запас під сам цінник: точка — його низ, а напис тягнеться в боки й угору
        m.fitBounds(boundsOf(items), { padding: 80, animate: false });
      } else {
        m.jumpTo({ center: [items[0].lng, items[0].lat], zoom: Math.max(zoom, 14) });
      }
    });
    refit.current = () => fitToItems(true);

    quietly(() => m.resize());
    // перегрупування після руху карти вибірку не міняє — підганяємо лише під нову
    if (fittedFor.current !== items) {
      const first = fittedFor.current === null;
      fittedFor.current = items;
      fitToItems(first);
    }

    const cancelClose = () => {
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    };

    // кластер: показуємо кількість, клік — наближення до його меж
    const addCluster = (pins: Pin[], lat: number, lng: number) => {
      const size = pins.length > 20 ? 52 : pins.length > 8 ? 46 : 40;
      // MapLibre ставить маркеру власний transform на кожному кадрі, тож вигляд
      // (і анімації наведення) — на внутрішньому елементі, а не на самому маркері
      const node = document.createElement('div');
      const face = node.appendChild(document.createElement('div'));
      face.className = 'pin-cluster';
      face.style.width = face.style.height = `${size}px`;
      face.textContent = String(pins.length);
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        m.fitBounds(boundsOf(pins), { padding: 60, maxZoom: 17 });
      });
      return new ml.Marker({ element: node }).setLngLat([lng, lat]).addTo(m);
    };

    const addPin = (l: Pin) => {
      const node = document.createElement('div');
      const face = node.appendChild(document.createElement('div'));
      face.className = detail ? 'price-pin price-pin--hero' : 'price-pin';
      face.classList.toggle('is-active', l.id === activeIdRef.current);
      face.textContent = l.label ?? money.short(l.price, l.deal, lang);
      // цінник висить над будинком, як прапорець, — сам будинок і сяйво під ним лишаються видні
      const mk = new ml.Marker({ element: node, anchor: 'bottom', offset: detail ? [0, -30] : [0, -12] })
        .setLngLat([l.lng, l.lat])
        .addTo(m);

      if (interactive && !detail) {
        const popup = new ml.Popup({
          closeButton: false, closeOnClick: false, offset: 46, maxWidth: '240px', className: 'map-pop-wrap',
        }).setDOMContent(l.card
          ? buildCardNode(l.card, () => router.push(localePath(lang, l.card!.href)), t)
          : skeletonNode(l, t, lang, money));
        popups.current[l.id] = popup;

        const open = () => { cancelClose(); popup.setLngLat([l.lng, l.lat]).addTo(m); fill(); };
        const scheduleClose = (ms: number) => {
          closeTimer.current = setTimeout(() => { popup.remove(); onHoverRef.current?.(null); }, ms);
        };
        const fill = async () => {
          if (l.card) return;
          const listing = cache.current[l.id]
            ?? (await fetch(`/api/listings/${l.id}`).then((r) => r.json()).then((d) => d.listing).catch(() => null));
          if (!listing) return;
          cache.current[l.id] = listing;
          popup.setDOMContent(buildPopupNode(listing, () => router.push(localePath(lang, `/listings/${l.id}`)), t, lang, money));
        };
        // курсор із цінника переїхав на саму картку — не закриваємо її
        // (контейнер попапа створюється заново при кожному відкритті)
        popup.on('open', () => {
          const pnode = popup.getElement();
          pnode?.addEventListener('mouseenter', cancelClose);
          pnode?.addEventListener('mouseleave', () => scheduleClose(200));
        });

        node.addEventListener('mouseenter', () => { open(); onHoverRef.current?.(l.id); });
        node.addEventListener('mouseleave', () => scheduleClose(250));
        node.addEventListener('click', (e) => { e.stopPropagation(); open(); onSelectRef.current?.(l.id); });
      }

      markers.current[l.id] = mk;
      return mk;
    };

    // що має бути на карті зараз: групи в межах видимої області з запасом в екран
    // на кожен бік, щоб при перетягуванні цінники не зʼявлялись із запізненням
    const { clientWidth: w, clientHeight: h } = m.getContainer();
    const groups = detail ? items.map((p) => ({ pins: [p], lat: p.lat, lng: p.lng })) : clusterize(ml, m, items);
    const want = new Map<string, (typeof groups)[number]>();
    groups.forEach((g) => {
      if (!detail) {
        const pt = m.project([g.lng, g.lat]);
        if (pt.x < -w || pt.x > 2 * w || pt.y < -h || pt.y > 2 * h) return;
      }
      want.set(g.pins.length === 1 ? `p:${g.pins[0].id}` : `c:${g.pins.map((p) => p.id).join(',')}`, g);
    });

    shown.current.forEach((mk, key) => {
      if (want.has(key)) return;
      mk.remove();
      shown.current.delete(key);
      if (key.startsWith('p:')) {
        const id = key.slice(2);
        popups.current[id]?.remove();
        delete popups.current[id];
        delete markers.current[id];
      }
    });
    want.forEach((g, key) => {
      if (shown.current.has(key)) return;
      shown.current.set(key, g.pins.length === 1 ? addPin(g.pins[0]) : addCluster(g.pins, g.lat, g.lng));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ready, viewTick, lang, money]);

  /*
   * --- будинки обʼєктів помаранчеві: шукаємо їх у векторних тайлах біля пінів ---
   * На сторінці обʼєкта ще й заливаємо ділянку і, якщо OSM будинку не знає,
   * малюємо умовний. Від 13-го зуму, коли в тайлах зʼявляються будинки.
   */
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !items.length) return;
    const hl = m.getSource('hl') as GeoJSONSource;
    const plotSrc = m.getSource('plot') as GeoJSONSource;
    // setData сам знову будить карту, і після нього прийде ще один idle —
    // оновлюємо джерела лише коли результат справді змінився, інакше вийде цикл
    let last = '';
    // idle приходить і після нашого ж setData — той самий вид вдруге не рахуємо
    let lastView = '';
    const put = (buildings: FeatureCollection, plot: FeatureCollection) => {
      const key = JSON.stringify([buildings, plot]);
      if (key === last) return;
      last = key;
      hl.setData(buildings);
      plotSrc.setData(plot);
    };
    const highlight = () => {
      if (!m.isSourceLoaded('omt')) return;
      const viewKey = `${m.getZoom()}|${m.getBounds().toArray()}`;
      if (!detail && viewKey === lastView) return;
      lastView = viewKey;
      if (m.getZoom() < 13) { put(EMPTY, EMPTY); return; }
      const feats = m.querySourceFeatures('omt', { sourceLayer: 'building' }) as never;
      if (detail) {
        const pin = items[0];
        const { buildings, plot, center } = listingFootprint(pin.lat, pin.lng, feats, {
          radius: 30, reach: 80, fallbackHeight: FALLBACK_HEIGHT[pin.type ?? 'condo'],
        });
        put({ type: 'FeatureCollection', features: buildings }, plot ? { type: 'FeatureCollection', features: [plot] } : EMPTY);
        markers.current[pin.id]?.setLngLat((center ?? [pin.lng, pin.lat]) as [number, number]);
        return;
      }
      const view = m.getBounds();
      const inView = items.filter((p) => view.contains([p.lng, p.lat])).slice(0, 60);
      put({
        type: 'FeatureCollection',
        features: inView.flatMap((p) => listingFootprint(p.lat, p.lng, feats, {
          radius: 25, reach: 60, fallbackHeight: FALLBACK_HEIGHT[p.type ?? 'condo'],
        }).buildings),
      }, EMPTY);
    };
    highlight();
    m.on('idle', highlight);
    return () => { m.off('idle', highlight); };
  }, [items, ready, detail]);

  /* --- місця поблизости: підписані точки навколо обʼєкта --- */
  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ready || !ml || !m) return;
    placeMarkers.current.forEach((mk) => mk.remove());
    placeMarkers.current = pinned.map((p) => {
      const node = document.createElement('div');
      node.className = 'place-pin';
      node.title = t(categoryLabel(p.category));
      node.textContent = p.name;
      return new ml.Marker({ element: node, anchor: 'bottom' }).setLngLat([p.lng!, p.lat!]).addTo(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinnedKey, lang]);

  /* --- підсвітка активного --- */
  useEffect(() => {
    activeIdRef.current = activeId;
    Object.entries(markers.current).forEach(([id, mk]) => {
      const node = mk.getElement();
      node.firstElementChild?.classList.toggle('is-active', id === activeId);
      node.style.zIndex = id === activeId ? '2' : '';
    });
  }, [activeId, items, ready, viewTick]);

  /* --- шари: схема / супутник --- */
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty(SATELLITE_LAYER, 'visibility', satellite ? 'visible' : 'none');
    FILL_LAYERS.forEach((id) => m.setLayoutProperty(id, 'visibility', satellite ? 'none' : 'visible'));
    m.setPaintProperty(BUILDINGS_LAYER, 'fill-extrusion-opacity', satellite ? 0.55 : 1);
  }, [satellite, ready]);

  /* --- лінійка --- */
  useEffect(() => {
    rulerRef.current = ruler;
    const m = map.current;
    if (!ready || !m) return;
    m.getCanvas().style.cursor = ruler ? 'crosshair' : '';
    if (ruler) m.doubleClickZoom.disable(); else if (interactive) m.doubleClickZoom.enable();
    const pts = ruler ? rulerPts : [];
    (m.getSource('ruler') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [
        ...pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: p } })),
        ...(pts.length > 1
          ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pts } }]
          : []),
      ],
    });
  }, [ruler, rulerPts, ready, interactive]);

  const toggleRuler = () => { setRuler((r) => !r); setRulerPts([]); };

  const locate = () => {
    const ml = lib.current;
    const m = map.current;
    if (!ml || !m || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const at: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      if (!locMarker.current) {
        const dot = document.createElement('div');
        dot.className = 'map-me';
        locMarker.current = new ml.Marker({ element: dot });
      }
      locMarker.current.setLngLat(at).addTo(m);
      m.flyTo({ center: at, zoom: Math.max(m.getZoom(), 15) });
    }, () => {}, { enableHighAccuracy: true, timeout: 10_000 });
  };

  return (
    <div id="map" className={detail ? 'map--detail' : undefined}>
      <div ref={el} className="map-canvas" />
      {interactive && ready && (
        <div className="map-ctrl">
          <button
            type="button" className="map-ctrl__btn" title={t('Reset north and tilt')} aria-label={t('Reset north and tilt')}
            onClick={() => map.current?.easeTo({ bearing: 0, pitch: 0 })}
          >
            <svg width="16" height="22" viewBox="0 0 16 22" style={{ transform: `rotate(${-bearing}deg)` }}>
              <path d="M8 1 13 11H3z" fill="#e5484d" />
              <path d="M8 21 3 11h10z" fill="#0f0f10" />
            </svg>
          </button>
          <button
            type="button" className={`map-ctrl__btn${satellite ? ' is-on' : ''}`}
            title={satellite ? t('Map') : t('Satellite')} aria-label={t('Switch map layer')} aria-pressed={satellite}
            onClick={() => setSatellite((s) => !s)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="m12 3 9 5-9 5-9-5z" fill="currentColor" />
              <path d="m3 13 9 5 9-5" />
            </svg>
          </button>
          <div className="map-ctrl__group">
            <button
              type="button" className={`map-ctrl__btn${ruler ? ' is-on' : ''}`}
              title={t('Measure distance')} aria-label={t('Measure distance')} aria-pressed={ruler} onClick={toggleRuler}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="8" width="20" height="8" rx="1.5" />
                <path d="M6 8v3M10 8v4M14 8v3M18 8v4" />
              </svg>
            </button>
            <button type="button" className="map-ctrl__btn" title={t('My location')} aria-label={t('My location')} onClick={locate}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
              </svg>
            </button>
            <button type="button" className="map-ctrl__btn" title={t('Zoom in')} aria-label={t('Zoom in')} onClick={() => map.current?.zoomIn()}>
              <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button type="button" className="map-ctrl__btn" title={t('Zoom out')} aria-label={t('Zoom out')} onClick={() => map.current?.zoomOut()}>
              <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14" /></svg>
            </button>
          </div>
        </div>
      )}
      {ruler && (
        <div className="map-ruler">
          {rulerPts.length > 1 ? fmtDistance(pathLength(rulerPts)) : t('Click on the map to measure')}
          {rulerPts.length > 0 && (
            <button type="button" onClick={() => setRulerPts([])}>{t('Clear')}</button>
          )}
        </div>
      )}
    </div>
  );
}
