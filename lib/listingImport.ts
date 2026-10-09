/**
 * Імпорт оголошень агенції: CSV або XML-фід Kyero v3. Розбір файлу — у браузері,
 * тут спільні для браузера й сервера частини: нормалізація рядка, порівняння
 * з уже імпортованими оголошеннями й шаблон CSV.
 * Ключ — external_id (код обʼєкта в системі агенції), унікальний у межах ріелтора.
 */
import { AREA_CENTRES, NEIGHBORHOODS, SQFT_PER_M2 } from './format';
import type { Deal, PropertyType } from './types';

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_PHOTOS = 50;
/** Скільки рядків застосовуємо одним запитом: укладаємось у час функції */
export const IMPORT_CHUNK = 20;
const ACRE_M2 = 4046.8564;

/** Рядок імпорту. Поле, якого немає у файлі, — undefined: при оновленні його не чіпаємо. */
export interface ImportRow {
  line: number;
  externalId: string;
  title?: string;
  deal?: Deal;
  type?: PropertyType;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotAcres?: number;
  year?: number;
  hoa?: number;
  neighborhood?: string;
  address?: string;
  lat?: number;
  lng?: number;
  text?: string;
  photos?: string[];
  oceanfront?: boolean;
  tags?: string[];
  sourceUrl?: string;
  /** Назву склали ми (у фіді її немає) — потрібна лише новому оголошенню, правку ріелтора не перетираємо */
  autoTitle?: boolean;
}

/** Поля, які імпорт порівнює й оновлює */
export const IMPORT_FIELDS = [
  'title', 'deal', 'type', 'price', 'beds', 'baths', 'sqft', 'lotAcres', 'year', 'hoa',
  'neighborhood', 'address', 'lat', 'lng', 'text', 'photos', 'oceanfront', 'tags', 'sourceUrl',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Уже імпортоване оголошення ріелтора — те, з чим порівнюємо */
export type ImportedListing = { id: string; externalId: string; active: boolean; review: string } & Required<Pick<ImportRow, ImportField>>;

export type ImportPlan =
  | { kind: 'new'; row: ImportRow }
  | { kind: 'update'; row: ImportRow; id: string; fields: ImportField[] }
  | { kind: 'same'; row: ImportRow; id: string }
  | { kind: 'error'; row: Partial<ImportRow> & { line: number }; message: string };

/* ---------- дрібні перетворення ---------- */

const numOrUndef = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).replace(/[$€£,\s]/g, '').replace(/^usd/i, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const strOrUndef = (v: unknown, max: number) => {
  const s = typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
  return s ? s.slice(0, max) : undefined;
};
const boolOf = (v: unknown) => /^(1|yes|y|true|si|sí|x)$/i.test(String(v ?? '').trim());
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/harbor\b/, 'harbour').replace(/\s+/g, ' ').trim();

/** «french harbor» → «French Harbour». Невідомий район лишаємо як є; назва острова районом не вважається. */
export function matchArea(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    if (!c) continue;
    const hit = NEIGHBORHOODS.find((n) => fold(n) === fold(c));
    if (hit) return hit;
  }
  return candidates.map((c) => c?.trim()).find((c) => c && !/^(roatan|isla de roatan|islas de la bahia|bay islands|honduras)$/.test(fold(c)));
}

export function dealOf(v: unknown): Deal | undefined {
  const s = fold(String(v ?? ''));
  if (!s) return undefined;
  if (/^(sale|sell|for sale|buy|venta|s)$/.test(s)) return 'sale';
  if (/^(rent|rental|for rent|lease|let|alquiler|renta|r|month|monthly)$/.test(s)) return 'rent';
  return undefined;
}

/** Типи Kyero й поширені назви з CRM → наші чотири */
export function typeOf(v: unknown): PropertyType | undefined {
  const s = fold(String(v ?? ''));
  if (!s) return undefined;
  if (/(land|plot|lot|terreno|solar|parcel|acre)/.test(s)) return 'land';
  if (/(commercial|office|shop|retail|restaurant|hotel|business|warehouse|local|oficina|bar|resort|building)/.test(s)) return 'commercial';
  if (/(condo|apartment|apartamento|flat|penthouse|studio|duplex|loft|unit)/.test(s)) return 'condo';
  if (/(house|villa|home|casa|bungalow|cottage|cabin|chalet|town ?house|finca|estate|residence)/.test(s)) return 'house';
  return undefined;
}

export const splitPhotos = (v: unknown) => String(v ?? '').split(/[\s|,;]+/).filter(Boolean);

/** Лише http(s), без повторів, не більше 50 */
export const cleanPhotoUrls = (list: unknown) =>
  [...new Set((Array.isArray(list) ? list : []).map((u) => String(u).trim()).filter((u) => /^https?:\/\/[^\s"'<>]+$/i.test(u) && u.length <= 1000))]
    .slice(0, IMPORT_MAX_PHOTOS);

/* ---------- CSV ---------- */

/** Заголовки CSV: перше, що збіглося, виграє. Регістр, пробіли й підкреслення не важать. */
const CSV_COLUMNS: [keyof ImportRow | 'm2' | 'plotM2', RegExp][] = [
  ['externalId', /^(externalid|external|id|ref|reference|refno|propertyid|listingid|code|mls)$/],
  ['title', /^(title|name|headline)$/],
  ['deal', /^(deal|operation|listingtype|for|transaction|pricefreq|pricefrequency)$/],
  ['type', /^(type|propertytype|category|kind)$/],
  ['price', /^(price|priceusd|askingprice|listprice)$/],
  ['beds', /^(beds|bedrooms|bed|br)$/],
  ['baths', /^(baths|bathrooms|bath|ba)$/],
  ['sqft', /^(sqft|sqfeet|ft2|areaft2|sizeft2|livingareaft2|builtft2|squarefeet)$/],
  ['m2', /^(m2|sqm|aream2|sizem2|built|builtm2|builtarea|squaremeters|squaremetres)$/],
  ['lotAcres', /^(lotacres|acres|lot|lotsize)$/],
  ['plotM2', /^(plot|plotm2|lotm2|landm2)$/],
  ['year', /^(year|yearbuilt|builtyear)$/],
  ['hoa', /^(hoa|hoamonthly|fees|condofee)$/],
  ['neighborhood', /^(neighborhood|neighbourhood|area|location|town|community|zone)$/],
  ['address', /^(address|street)$/],
  ['lat', /^(lat|latitude)$/],
  ['lng', /^(lng|lon|long|longitude)$/],
  ['text', /^(description|desc|text|body|details|remarks)$/],
  ['photos', /^(photos|images|photourls|imageurls|pictures|gallery)$/],
  ['oceanfront', /^(oceanfront|beachfront|waterfront)$/],
  ['tags', /^(tags|features|amenities)$/],
  ['sourceUrl', /^(url|link|sourceurl|website)$/],
];

const headKey = (h: string) => h.toLowerCase().replace(/²/g, '2').replace(/[\s_\-.()#]/g, '');

/** Таблиця CSV → рядки імпорту. Порожня колонка = поле не чіпаємо. */
export function rowsFromTable(table: string[][]): { rows: ImportRow[]; columns: string[] } {
  const [head, ...body] = table;
  if (!head) return { rows: [], columns: [] };
  const keys = head.map(headKey);
  const col: Partial<Record<string, number>> = {};
  for (const [field, re] of CSV_COLUMNS) {
    const i = keys.findIndex((k, idx) => re.test(k) && !Object.values(col).includes(idx));
    if (i >= 0 && col[field] === undefined) col[field] = i;
  }
  const rows = body.slice(0, IMPORT_MAX_ROWS).map((cells, n): ImportRow => {
    const at = (f: string) => (col[f] !== undefined ? (cells[col[f]!] ?? '').trim() : undefined);
    const has = (f: string) => col[f] !== undefined && (cells[col[f]!] ?? '').trim() !== '';
    const m2 = numOrUndef(at('m2'));
    const plot = numOrUndef(at('plotM2'));
    const row: ImportRow = { line: n + 2, externalId: at('externalId') ?? '' };
    if (has('title')) row.title = at('title');
    if (has('deal')) row.deal = dealOf(at('deal'));
    if (has('type')) row.type = typeOf(at('type'));
    if (has('price')) row.price = numOrUndef(at('price'));
    for (const f of ['beds', 'baths', 'year', 'hoa', 'lat', 'lng', 'lotAcres', 'sqft'] as const) {
      if (has(f)) row[f] = numOrUndef(at(f));
    }
    if (row.sqft === undefined && m2) row.sqft = Math.round(m2 * SQFT_PER_M2);
    if (row.lotAcres === undefined && plot) row.lotAcres = Math.round((plot / ACRE_M2) * 100) / 100;
    if (has('neighborhood')) row.neighborhood = matchArea(at('neighborhood'));
    if (has('address')) row.address = at('address');
    if (has('text')) row.text = at('text');
    if (has('photos')) row.photos = cleanPhotoUrls(splitPhotos(at('photos')));
    if (has('oceanfront')) row.oceanfront = boolOf(at('oceanfront'));
    if (has('tags')) row.tags = String(at('tags')).split(/[|;,]/).map((s) => s.trim()).filter(Boolean);
    if (has('sourceUrl')) row.sourceUrl = at('sourceUrl');
    return row;
  });
  return { rows, columns: Object.keys(col) };
}

/* ---------- Kyero v3 ---------- */

/** Текст опису з HTML фіда: абзаци лишаємо, теги прибираємо */
function plainText(html: string) {
  const withBreaks = html.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*p\s*>/gi, '\n\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Документ Kyero v3 (<root><property>…) → рядки імпорту. Лише для браузера (DOMParser). */
export function rowsFromKyero(doc: Document): { rows: ImportRow[]; currencyErrors: number } {
  const kids = (el: Element | null | undefined, tag: string) =>
    el ? Array.from(el.children).filter((c) => c.localName === tag) : [];
  const one = (el: Element | null | undefined, path: string) => {
    let cur: Element | undefined = el ?? undefined;
    for (const tag of path.split('/')) cur = kids(cur, tag)[0];
    return cur?.textContent?.trim() ?? '';
  };
  const lang = (el: Element | undefined) => {
    if (!el) return '';
    const by = (l: string) => kids(el, l)[0]?.textContent?.trim() ?? '';
    return by('en') || by('es') || (el.children[0]?.textContent?.trim() ?? el.textContent?.trim() ?? '');
  };

  let currencyErrors = 0;
  const props = Array.from(doc.getElementsByTagName('property')).slice(0, IMPORT_MAX_ROWS);
  const rows = props.map((p, n): ImportRow => {
    const freq = fold(one(p, 'price_freq'));
    const deal: Deal = freq === 'month' || freq === 'week' ? 'rent' : 'sale';
    let price = numOrUndef(one(p, 'price'));
    // тижнева оренда → місячна, бо сайт показує ціну оренди за місяць
    if (price && freq === 'week') price = Math.round((price * 52) / 12);
    const currency = one(p, 'currency').toUpperCase();
    if (currency && currency !== 'USD') { currencyErrors++; price = undefined; }

    const type = typeOf(one(p, 'type'));
    const beds = numOrUndef(one(p, 'beds'));
    const town = one(p, 'town');
    const area = matchArea(one(p, 'location_detail'), town, one(p, 'province'));
    const built = numOrUndef(one(p, 'surface_area/built'));
    const plot = numOrUndef(one(p, 'surface_area/plot'));
    const lat = numOrUndef(one(p, 'location/latitude'));
    const lng = numOrUndef(one(p, 'location/longitude'));
    const images = kids(kids(p, 'images')[0], 'image')
      .map((img, i) => ({ url: one(img, 'url'), order: Number(img.getAttribute('id')) || i + 1 }))
      .sort((a, b) => a.order - b.order).map((x) => x.url);
    const features = kids(kids(p, 'features')[0], 'feature').map((f) => f.textContent?.trim() ?? '').filter(Boolean);
    const title = lang(kids(p, 'title')[0]);

    const row: ImportRow = {
      line: n + 1,
      externalId: one(p, 'ref') || one(p, 'id'),
      deal, price,
    };
    // порожній опис чи галерея у фіді не стирають уже наявні
    const text = plainText(lang(kids(p, 'desc')[0]));
    if (text) row.text = text;
    if (images.length) row.photos = cleanPhotoUrls(images);
    if (type) row.type = type;
    if (title) row.title = title;
    else if (type && area) {
      const kind = { condo: 'Condo', house: 'House', land: 'Land', commercial: 'Commercial property' }[type];
      row.title = `${beds && type !== 'land' ? `${beds}-bedroom ${kind.toLowerCase()}` : kind} in ${area}`;
      row.autoTitle = true;
    }
    if (beds !== undefined) row.beds = beds;
    const baths = numOrUndef(one(p, 'baths'));
    if (baths !== undefined) row.baths = baths;
    if (built) row.sqft = Math.round(built * SQFT_PER_M2);
    if (plot) row.lotAcres = Math.round((plot / ACRE_M2) * 100) / 100;
    if (area) row.neighborhood = area;
    if (lat && lng) { row.lat = lat; row.lng = lng; }
    if (features.length) row.tags = features;
    const url = lang(kids(p, 'url')[0]);
    if (url) row.sourceUrl = url;
    return row;
  });
  return { rows, currencyErrors };
}

/* ---------- перевірка й порівняння (і в браузері, і на сервері) ---------- */

/** Рядок із запиту: обрізаємо все до розумних меж. Помилка — текстом. */
export function cleanImportRow(v: unknown): ImportRow | { line: number; externalId: string; error: string } {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const line = Number(r.line) || 0;
  const externalId = String(r.externalId ?? '').trim().slice(0, 120);
  if (!externalId) return { line, externalId, error: 'No reference / external ID' };
  const out: ImportRow = { line, externalId };
  const num = (k: keyof ImportRow, min: number, max: number) => {
    if (r[k] === undefined || r[k] === null) return;
    const n = Number(r[k]);
    if (Number.isFinite(n) && n >= min && n <= max) (out as unknown as Record<string, unknown>)[k] = n;
  };
  if (r.title !== undefined) out.title = strOrUndef(r.title, 140);
  if (r.autoTitle === true) out.autoTitle = true;
  if (r.deal === 'sale' || r.deal === 'rent') out.deal = r.deal;
  if (['condo', 'house', 'land', 'commercial'].includes(String(r.type))) out.type = r.type as PropertyType;
  num('price', 1, 1e9); num('beds', 0, 50); num('baths', 0, 50); num('sqft', 0, 1e6);
  num('lotAcres', 0, 9999); num('year', 0, 2100); num('hoa', 0, 1e6);
  num('lat', 15, 18); num('lng', -88, -83);
  if (out.beds !== undefined) out.beds = Math.round(out.beds);
  if (out.sqft !== undefined) out.sqft = Math.round(out.sqft);
  if (out.year !== undefined) out.year = Math.round(out.year);
  if (out.baths !== undefined) out.baths = Math.round(out.baths * 2) / 2;
  if (out.lotAcres !== undefined) out.lotAcres = Math.round(out.lotAcres * 100) / 100;
  if (r.neighborhood !== undefined) out.neighborhood = matchArea(strOrUndef(r.neighborhood, 60));
  if (r.address !== undefined) out.address = strOrUndef(r.address, 120) ?? '';
  if (r.text !== undefined) out.text = (strOrUndef(r.text, 10000) ?? '');
  if (r.photos !== undefined) out.photos = cleanPhotoUrls(r.photos);
  if (r.oceanfront !== undefined) out.oceanfront = Boolean(r.oceanfront);
  if (Array.isArray(r.tags)) out.tags = r.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 30);
  if (r.sourceUrl !== undefined) {
    const u = String(r.sourceUrl ?? '').trim();
    out.sourceUrl = /^https?:\/\//i.test(u) ? u.slice(0, 500) : '';
  }
  if ((out.lat === undefined) !== (out.lng === undefined)) { delete out.lat; delete out.lng; }
  return out;
}

/** Для нового оголошення потрібні назва, ціна, тип угоди, тип обʼєкта й район */
function missingForNew(r: ImportRow) {
  const miss = [
    !r.title && 'title', !r.price && 'price', !r.deal && 'deal (sale / rent)',
    !r.type && 'type', !r.neighborhood && 'area',
  ].filter(Boolean);
  return miss.length ? `Missing ${miss.join(', ')}` : '';
}

const same = (a: unknown, b: unknown, field: ImportField) => {
  if (field === 'lat' || field === 'lng') return Math.abs(Number(a) - Number(b)) < 1e-5;
  if (typeof a === 'number' || typeof b === 'number') return Math.abs(Number(a) - Number(b)) < 0.01;
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  if (typeof a === 'string' || typeof b === 'string') return String(a ?? '').trim() === String(b ?? '').trim();
  return a === b;
};

/** План для кожного рядка: новий / оновити (які поля) / без змін / помилка */
export function planImport(rawRows: unknown[], existing: ImportedListing[]): ImportPlan[] {
  const byRef = new Map(existing.map((e) => [e.externalId, e]));
  const seen = new Set<string>();
  return rawRows.map((raw): ImportPlan => {
    const r = cleanImportRow(raw);
    if ('error' in r) return { kind: 'error', row: r, message: r.error };
    if (seen.has(r.externalId)) return { kind: 'error', row: r, message: 'Same reference appears twice in the file' };
    seen.add(r.externalId);
    if (r.deal === undefined && (raw as Record<string, unknown>)?.deal) return { kind: 'error', row: r, message: 'Unknown deal — use sale or rent' };
    if (r.type === undefined && (raw as Record<string, unknown>)?.type) return { kind: 'error', row: r, message: 'Unknown property type — use condo, house, land or commercial' };

    const cur = byRef.get(r.externalId);
    if (!cur) {
      const miss = missingForNew(r);
      return miss ? { kind: 'error', row: r, message: miss } : { kind: 'new', row: r };
    }
    const fields = IMPORT_FIELDS.filter((f) => r[f] !== undefined && !(f === 'title' && r.autoTitle) && !same(r[f], cur[f], f));
    return fields.length ? { kind: 'update', row: r, id: cur.id, fields } : { kind: 'same', row: r, id: cur.id };
  });
}

/** Поля нового оголошення: координати без файлу — центр району (або «без координат») */
export function newListingInput(r: ImportRow) {
  const centre = r.neighborhood ? AREA_CENTRES[r.neighborhood] : undefined;
  const { line: _line, autoTitle: _auto, externalId, ...rest } = r;
  void _line; void _auto;
  return {
    ...rest,
    externalId,
    lat: r.lat ?? centre?.[0] ?? 16.3,
    lng: r.lng ?? centre?.[1] ?? -86.59,
    sourceUrl: r.sourceUrl ?? '',
  };
}

/** Шаблон CSV, який віддаємо агенції */
export const CSV_TEMPLATE = [
  'external_id,title,deal,type,price,beds,baths,m2,lot_acres,year,hoa,neighborhood,address,latitude,longitude,description,photos,oceanfront',
  'WB-101,Ocean view condo in West Bay,sale,condo,289000,2,2,95,,2019,350,West Bay,,16.2752,-86.5977,"Two-bedroom condo a short walk from the beach.",https://example.com/1.jpg|https://example.com/2.jpg,no',
  'FH-7,Hillside lot with sea view,sale,land,85000,,,,0.5,,,French Harbour,,,,"Half an acre with road access and power.",,no',
].join('\n');
