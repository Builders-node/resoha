import type { Feature, Polygon, Position } from 'geojson';

/**
 * Невелика геометрія для сторінки обʼєкта: знайти будинки біля точки, підсвітити їх
 * і обвести «ділянку». Працюємо в локальних метрах навколо точки — на відстанях
 * у сотні метрів похибка рівнокутної проєкції непомітна.
 */
type XY = [number, number];

const M_PER_DEG = 111_320;

export function localProjection(lat0: number, lng0: number) {
  const kx = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: ([lng, lat]: Position): XY => [(lng - lng0) * kx, (lat - lat0) * M_PER_DEG],
    toLngLat: ([x, y]: XY): Position => [lng0 + x / kx, lat0 + y / M_PER_DEG],
  };
}

function inside(p: XY, ring: XY[]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function segDist(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Відстань від точки до полігона в метрах; 0 — точка всередині. */
function distTo(p: XY, ring: XY[]) {
  if (inside(p, ring)) return 0;
  let d = Infinity;
  for (let i = 1; i < ring.length; i++) d = Math.min(d, segDist(p, ring[i - 1], ring[i]));
  return d;
}

/** Опукла оболонка (монотонний ланцюг Ендрю). */
function hull(pts: XY[]): XY[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (s.length < 3) return s;
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: XY[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Розсуваємо кільце від його центру на `by` метрів (грубий буфер для опуклих фігур). */
function grow(ring: XY[], by: number, scale = 1): XY[] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    const k = scale + by / d;
    return [cx + (x - cx) * k, cy + (y - cy) * k];
  });
}

type Building = Feature<Polygon, { render_height?: number; render_min_height?: number }>;

/**
 * Будинки обʼєкта: ті, що містять точку або стоять ближче за `radius` метрів.
 * Повертає підсвічені будинки (трохи збільшені, щоб стіни не мерехтіли поверх
 * звичайних) і контур ділянки навколо них.
 */
export function listingFootprint(
  lat: number, lng: number, features: { geometry: unknown; properties: Record<string, unknown> }[], radius = 30,
) {
  const { toXY, toLngLat } = localProjection(lat, lng);
  const seen = new Set<string>();
  const near: { ring: XY[]; d: number; props: Record<string, unknown> }[] = [];

  for (const f of features) {
    if (f.properties.hide_3d) continue;
    const g = f.geometry as { type: string; coordinates: Position[][] | Position[][][] };
    const polys = g.type === 'Polygon' ? [g.coordinates as Position[][]]
      : g.type === 'MultiPolygon' ? (g.coordinates as Position[][][]) : [];
    for (const poly of polys) {
      const outer = poly[0];
      // один будинок приходить кількома шматками з сусідніх тайлів — відкидаємо повтори
      const key = outer.map((p) => p.map((v) => v.toFixed(6)).join(',')).join(';');
      if (seen.has(key)) continue;
      seen.add(key);
      const ring = outer.map(toXY);
      const d = distTo([0, 0], ring);
      if (d <= radius) near.push({ ring, d, props: f.properties });
    }
  }
  near.sort((a, b) => a.d - b.d);
  const picked = near.slice(0, 8);

  const buildings: Building[] = picked.map(({ ring, props }) => ({
    type: 'Feature',
    properties: {
      render_height: Number(props.render_height ?? 6) + 0.3,
      render_min_height: Number(props.render_min_height ?? 0),
    },
    geometry: { type: 'Polygon', coordinates: [grow(ring, 0, 1.012).map(toLngLat)] },
  }));

  let plot: Feature<Polygon> | null = null;
  if (picked.length) {
    const h = hull(picked.flatMap((b) => b.ring));
    if (h.length >= 3) {
      const ring = grow(h, 12).map(toLngLat);
      plot = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] } };
    }
  }
  return { buildings, plot };
}

/** Довжина ламаної в метрах (гаверсинус — лінійка може тягнутися на кілометри). */
export function pathLength(points: Position[]) {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1];
    const [lng2, lat2] = points[i];
    const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
      + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
    sum += 2 * R * Math.asin(Math.sqrt(a));
  }
  return sum;
}

export const fmtDistance = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 1 : 2)} km` : `${Math.round(m)} m`;
