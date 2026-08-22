'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEAL_LABELS, fmtPrice, fmtPriceShort, photoUrl, specLine } from '@/lib/format';
import type { Deal, Listing } from '@/lib/types';

/** Карті потрібні лише координати й ціна — картку вона підвантажує окремо. */
export type Pin = { id: string; lat: number; lng: number; price: number; deal: Deal };

type Props = {
  items: Pin[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
};

/** Скелет картки: показуємо одразу, поки вантажиться сам обʼєкт. */
function skeletonNode(pin: Pin) {
  const node = document.createElement('div');
  node.className = 'map-pop map-pop--loading';
  node.innerHTML = `<div class="map-pop__b"><div class="map-pop__price">${fmtPrice(pin.price, pin.deal)}</div>
    <div class="map-pop__meta">Loading…</div></div>`;
  return node;
}

/** Міні-картка, що зʼявляється прямо на карті при наведенні на цінник. */
function buildPopupNode(l: Listing, onClick: () => void) {
  const node = document.createElement('div');
  node.className = 'map-pop';
  node.innerHTML = `
    <img src="${photoUrl(l.photos[0], 480, 380)}" alt="" loading="lazy">
    <span class="badge ${l.deal === 'rent' ? 'badge--accent' : 'badge--brand'}">${DEAL_LABELS[l.deal]}</span>
    ${l.oceanfront ? '<span class="badge map-pop__ocean">Oceanfront</span>' : ''}
    <div class="map-pop__b">
      <div class="map-pop__title">${l.title}</div>
      <div class="map-pop__meta">${l.neighborhood} · ${specLine(l)}</div>
      <div class="map-pop__price">${fmtPrice(l.price, l.deal)}</div>
    </div>`;
  node.addEventListener('click', onClick);
  return node;
}

export default function MapView({
  items, activeId, onSelect, onHover, center = [16.36, -86.45], zoom = 11, interactive = true,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Record<string, Listing>>({});
  const clusterLayer = useRef<Marker[]>([]);
  const [zoomTick, setZoomTick] = useState(0);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;

  const [ready, setReady] = useState(false);
  const router = useRouter();

  /* --- ініціалізація --- */
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current || map.current) return;

      const m = L.map(el.current, {
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
      }).setView(center, zoom);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(m);

      // перегруповуємо після кожної зміни масштабу
      m.on('zoomend', () => setZoomTick((t) => t + 1));
      map.current = m;
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(el.current);
      setTimeout(() => m.invalidateSize(), 0);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      markers.current = {};
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Групуємо піни, що злипаються на екрані: сітка 64px у поточному масштабі. */
  const clusterize = (L: typeof import('leaflet'), m: LeafletMap, pins: Pin[]) => {
    const CELL = 64;
    const cells = new Map<string, { pins: Pin[]; x: number; y: number }>();
    pins.forEach((p) => {
      const pt = m.latLngToLayerPoint([p.lat, p.lng]);
      const kx = Math.floor(pt.x / CELL);
      const ky = Math.floor(pt.y / CELL);
      const key = `${kx}:${ky}`;
      const cell = cells.get(key) ?? { pins: [], x: 0, y: 0 };
      cell.pins.push(p);
      cells.set(key, cell);
    });
    return [...cells.values()].map((c) => ({
      pins: c.pins,
      lat: c.pins.reduce((s2, p) => s2 + p.lat, 0) / c.pins.length,
      lng: c.pins.reduce((s2, p) => s2 + p.lng, 0) / c.pins.length,
    }));
  };

  /* --- маркери + hover-картка --- */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      const m = map.current;
      if (cancelled || !m) return;

      Object.values(markers.current).forEach((mk) => mk.remove());
      markers.current = {};
      clusterLayer.current.forEach((c) => c.remove());
      clusterLayer.current = [];

      const groups = clusterize(L, m, items);
      const singles: Pin[] = [];
      groups.forEach((g) => {
        if (g.pins.length === 1) { singles.push(g.pins[0]); return; }
        // кластер: показуємо кількість, клік — наближення до його меж
        const size = g.pins.length > 20 ? 52 : g.pins.length > 8 ? 46 : 40;
        const cluster = L.marker([g.lat, g.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="pin-cluster" style="width:${size}px;height:${size}px">${g.pins.length}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        }).addTo(m);
        cluster.on('click', () => {
          m.fitBounds(L.latLngBounds(g.pins.map((p) => [p.lat, p.lng] as [number, number])).pad(0.35));
        });
        clusterLayer.current.push(cluster);
      });

      const cancelClose = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
      };

      singles.forEach((l) => {
        const mk = L.marker([l.lat, l.lng], {
          riseOnHover: true,
          icon: L.divIcon({
            className: '',
            html: `<div class="price-pin">${fmtPriceShort(l.price, l.deal)}</div>`,
            iconSize: [72, 26],
            iconAnchor: [36, 13],
          }),
        }).addTo(m);

        if (interactive) {
          const fill = async () => {
            const listing = cache.current[l.id]
              ?? (await fetch(`/api/listings/${l.id}`).then((r) => r.json()).then((d) => d.listing).catch(() => null));
            if (!listing) return;
            cache.current[l.id] = listing;
            mk.setPopupContent(buildPopupNode(listing, () => router.push(`/listings/${l.id}`)));
          };

          mk.bindPopup(skeletonNode(l), {
            closeButton: false,
            autoPan: false,
            offset: [0, -12],
            minWidth: 240,
            maxWidth: 240,
            className: 'map-pop-wrap',
          });

          mk.on('mouseover', () => { cancelClose(); mk.openPopup(); fill(); onHoverRef.current?.(l.id); });
          mk.on('mouseout', () => {
            closeTimer.current = setTimeout(() => { mk.closePopup(); onHoverRef.current?.(null); }, 250);
          });
          mk.on('click', () => { cancelClose(); mk.openPopup(); fill(); onSelectRef.current?.(l.id); });

          // курсор із цінника переїхав на саму картку — не закриваємо її
          mk.on('popupopen', (e) => {
            const node = e.popup.getElement();
            if (!node) return;
            node.addEventListener('mouseenter', cancelClose);
            node.addEventListener('mouseleave', () => {
              closeTimer.current = setTimeout(() => { mk.closePopup(); onHoverRef.current?.(null); }, 200);
            });
          });
        }

        markers.current[l.id] = mk;
      });

      m.invalidateSize();
      if (zoomTick > 0) return;          // це перегрупування, а не нова вибірка
      if (items.length > 1) {
        m.fitBounds(L.latLngBounds(items.map((l) => [l.lat, l.lng] as [number, number])).pad(0.2), { animate: false });
      } else if (items.length === 1) {
        m.setView([items[0].lat, items[0].lng], Math.max(zoom, 14), { animate: false });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ready, zoomTick]);

  /* --- підсвітка активного --- */
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, mk]) => {
      mk.getElement()?.querySelector('.price-pin')?.classList.toggle('is-active', id === activeId);
      mk.setZIndexOffset(id === activeId ? 1000 : 0);
    });
  }, [activeId, items, ready]);

  return <div id="map" ref={el} />;
}
