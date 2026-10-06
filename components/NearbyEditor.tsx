'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapStyle } from '@/lib/mapStyle';
import { EMPTY_PLACE, NEARBY_CATEGORIES, NEARBY_MAX, NEARBY_UNITS, type NearbyPlace } from '@/lib/nearby';

/**
 * Секція форми «What's nearby»: ріелтор сам перелічує кафе, пляжі, парки.
 * Відстань і точка на карті — за бажанням; точку ставлять кліком по міні-карті.
 */
export default function NearbyEditor({
  value, onChange, pin,
}: {
  value: NearbyPlace[];
  onChange: (next: NearbyPlace[]) => void;
  /** координати самого обʼєкта — від них відкриваємо карту */
  pin: [number, number];
}) {
  // рядок, якому зараз ставимо точку; null — карта закрита
  const [picking, setPicking] = useState<number | null>(null);

  const set = (i: number, patch: Partial<NearbyPlace>) =>
    onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    setPicking(null);
  };

  return (
    <div className="field full nearby-form">
      <label>What&apos;s nearby</label>
      <span className="tiny muted" style={{ marginBottom: 10 }}>
        Cafés, beaches, dive shops, groceries — the places a buyer will walk or drive to. Distance and the map
        point are optional; with a point and no distance we show the straight-line distance.
      </span>

      {value.map((p, i) => (
        <div key={i} className="nearby-row">
          <input className="input nearby-row__name" placeholder="Name, e.g. Sundowners Beach Bar" value={p.name}
            maxLength={80} onChange={(e) => set(i, { name: e.target.value })} aria-label="Place name" />
          <select className="input" value={p.category} aria-label="Category"
            onChange={(e) => set(i, { category: e.target.value as NearbyPlace['category'] })}>
            {NEARBY_CATEGORIES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <div className="nearby-row__dist">
            <input className="input" type="number" min="0" step="any" placeholder="—" aria-label="Distance"
              value={p.distance ?? ''}
              onChange={(e) => set(i, { distance: e.target.value === '' ? null : Number(e.target.value) })} />
            <select className="input" value={p.unit} aria-label="Unit"
              onChange={(e) => set(i, { unit: e.target.value as NearbyPlace['unit'] })}>
              {NEARBY_UNITS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <div className="nearby-row__act">
            <button type="button" className={`btn btn--ghost btn--sm${picking === i ? ' is-on' : ''}`}
              onClick={() => setPicking(picking === i ? null : i)}>
              {p.lat !== null ? 'Move pin' : 'Pin on map'}
            </button>
            {p.lat !== null && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => set(i, { lat: null, lng: null })}>
                Clear pin
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(i)} aria-label="Remove place">
              Remove
            </button>
          </div>
        </div>
      ))}

      {picking !== null && value[picking] && (
        <PointPicker
          pin={pin}
          places={value}
          active={picking}
          onPick={(lat, lng) => set(picking, { lat, lng })}
          onDone={() => setPicking(null)}
        />
      )}

      {value.length < NEARBY_MAX && (
        <button type="button" className="btn btn--ghost" style={{ alignSelf: 'flex-start', marginTop: 4 }}
          onClick={() => onChange([...value, { ...EMPTY_PLACE }])}>
          + Add a place
        </button>
      )}
    </div>
  );
}

/** Міні-карта: помаранчевий — обʼєкт, темні — уже поставлені місця, клік ставить активне. */
function PointPicker({
  pin, places, active, onPick, onDone,
}: {
  pin: [number, number];
  places: NearbyPlace[];
  active: number;
  onPick: (lat: number, lng: number) => void;
  onDone: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !el.current) return;
      lib.current = ml;
      const start = places[active];
      const m = new ml.Map({
        container: el.current,
        style: mapStyle,
        center: start.lat !== null && start.lng !== null ? [start.lng, start.lat] : [pin[1], pin[0]],
        zoom: 15,
        attributionControl: { compact: true },
      });
      m.on('styleimagemissing', (e) => {
        if (!m.hasImage(e.id)) m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });
      m.getCanvas().style.cursor = 'crosshair';
      m.on('click', (e) => onPickRef.current(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6))));
      m.on('load', () => setReady(true));
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // карту створюємо один раз на відкриття; рядок міняється — перемальовуємо лише маркери
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ml = lib.current, m = map.current;
    if (!ready || !ml || !m) return;
    markers.current.forEach((mk) => mk.remove());
    const dot = (cls: string, title: string) => {
      const n = document.createElement('div');
      n.className = cls;
      n.title = title;
      return n;
    };
    markers.current = [
      new ml.Marker({ element: dot('nearby-dot nearby-dot--home', 'This property') }).setLngLat([pin[1], pin[0]]).addTo(m),
      ...places.flatMap((p, i) => (p.lat !== null && p.lng !== null
        ? [new ml.Marker({ element: dot(`nearby-dot${i === active ? ' nearby-dot--active' : ''}`, p.name || 'New place') })
          .setLngLat([p.lng, p.lat]).addTo(m)]
        : [])),
    ];
  }, [ready, places, active, pin]);

  const name = places[active]?.name || 'this place';
  return (
    <div className="nearby-pick">
      <div className="nearby-pick__bar">
        <span className="small">Click the map where <b>{name}</b> is. The orange dot is the property.</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={onDone}>Done</button>
      </div>
      <div ref={el} className="nearby-pick__map" />
    </div>
  );
}
