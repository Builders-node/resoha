'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BUILDINGS_LAYER, FILL_LAYERS, SATELLITE_LAYER, mapStyle } from '@/lib/mapStyle';

const round = (n: number) => Number(n.toFixed(6));

/**
 * Точка обʼєкта для форм: клік по карті або перетягування піна замість ручного введення координат.
 * Числа під картою лишаються — на випадок, коли координати вже відомі.
 */
export default function LocationPicker({
  value, onChange, hint,
}: {
  value: [number, number];
  onChange: (next: [number, number]) => void;
  hint?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marker = useRef<Marker | null>(null);
  // останнє значення, яке поставила сама карта — щоб не центрувати її під власним кліком
  const fromMap = useRef<[number, number] | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const [ready, setReady] = useState(false);
  const [satellite, setSatellite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current) return;
      const m = new ml.Map({
        container: el.current,
        style: mapStyle,
        center: [value[1], value[0]],
        zoom: 15,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      m.on('styleimagemissing', (e) => {
        if (!m.hasImage(e.id)) m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });
      m.getCanvas().style.cursor = 'crosshair';

      const pinEl = document.createElement('div');
      pinEl.className = 'loc-pin';
      const mk = new ml.Marker({ element: pinEl, anchor: 'bottom', draggable: true })
        .setLngLat([value[1], value[0]]).addTo(m);
      const emit = (lat: number, lng: number) => {
        const next: [number, number] = [round(lat), round(lng)];
        fromMap.current = next;
        onChangeRef.current(next);
      };
      mk.on('dragend', () => { const p = mk.getLngLat(); emit(p.lat, p.lng); });
      m.on('click', (e) => { mk.setLngLat(e.lngLat); emit(e.lngLat.lat, e.lngLat.lng); });
      m.on('load', () => setReady(true));
      marker.current = mk;
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // карту створюємо один раз; далі лише рухаємо пін
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // координати змінились ззовні (обрали район чи ввели числа) — переносимо пін і карту
  useEffect(() => {
    const m = map.current, mk = marker.current;
    if (!m || !mk || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) return;
    const own = fromMap.current;
    if (own && own[0] === value[0] && own[1] === value[1]) return;
    mk.setLngLat([value[1], value[0]]);
    m.easeTo({ center: [value[1], value[0]] });
  }, [value]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty(SATELLITE_LAYER, 'visibility', satellite ? 'visible' : 'none');
    FILL_LAYERS.forEach((id) => m.setLayoutProperty(id, 'visibility', satellite ? 'none' : 'visible'));
    m.setPaintProperty(BUILDINGS_LAYER, 'fill-extrusion-opacity', satellite ? 0.55 : 1);
  }, [satellite, ready]);

  return (
    <div className="loc-pick">
      <div className="loc-pick__bar">
        <span className="small">{hint ?? 'Click the map or drag the pin to the exact spot.'}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSatellite((s) => !s)}
          aria-pressed={satellite}>
          {satellite ? 'Map' : 'Satellite'}
        </button>
      </div>
      <div ref={el} className="loc-pick__map" />
      <div className="loc-pick__coords">
        <label className="tiny muted">Lat
          <input className="input" type="number" step="0.000001" value={value[0]}
            onChange={(e) => onChange([Number(e.target.value), value[1]])} /></label>
        <label className="tiny muted">Lng
          <input className="input" type="number" step="0.000001" value={value[1]}
            onChange={(e) => onChange([value[0], Number(e.target.value)])} /></label>
      </div>
    </div>
  );
}
