import type { Deal, ListingQuery, PropertyType, SortKey } from './types';

/** Єдина модель фільтрів для панелі, модалки та URL. */
export type Filters = {
  deal: string;
  type: string;
  neighborhoods: string[];
  beds: string[];
  bathsMin: string;
  priceMin: string;
  priceMax: string;
  sqftMin: string;
  sqftMax: string;
  lotMin: string;
  lotMax: string;
  hoaMax: string;
  yearMin: string;
  oceanfront: boolean;
  titled: boolean;
  ownerFinancing: boolean;
  /** земля, готова до будівництва — має сенс лише при type = land */
  ready: boolean;
  /** оренда: меблі, тварини, паркінг, кондиціонер */
  furnished: boolean;
  pets: boolean;
  parking: boolean;
  ac: boolean;
  /** '' | 'new' | 'resale' */
  build: string;
  reduced: boolean;
  /** додано за N днів: '' | '1' | '7' | '30' */
  days: string;
  tags: string[];
  agentId: string;
  agencyId: string;
  q: string;
  sort: string;
  /** «шукати в цій області»: межі карти як `south,west,north,east` */
  bbox: string;
};

export const EMPTY_FILTERS: Filters = {
  deal: '', type: '', neighborhoods: [], beds: [], bathsMin: '',
  priceMin: '', priceMax: '', sqftMin: '', sqftMax: '', lotMin: '', lotMax: '',
  hoaMax: '', yearMin: '', oceanfront: false, titled: false, ownerFinancing: false, ready: false,
  furnished: false, pets: false, parking: false, ac: false, build: '', reduced: false, days: '',
  tags: [], agentId: '', agencyId: '', q: '', sort: '', bbox: '',
};

export const AMENITIES = [
  'Pool', 'Private dock', 'Gated', 'Turnkey', 'Rental income', 'Off-grid solar', 'Golf', 'Ocean view',
];

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string) => { if (v) p.set(k, v); };

  put('deal', f.deal);
  put('type', f.type);
  put('neighborhoods', f.neighborhoods.join(','));
  put('beds', f.beds.join(','));
  put('bathsMin', f.bathsMin);
  put('priceMin', f.priceMin);
  put('priceMax', f.priceMax);
  put('sqftMin', f.sqftMin);
  put('sqftMax', f.sqftMax);
  put('lotMin', f.lotMin);
  put('lotMax', f.lotMax);
  if (f.hoaMax !== '') p.set('hoaMax', f.hoaMax);
  put('yearMin', f.yearMin);
  if (f.oceanfront) p.set('oceanfront', '1');
  if (f.titled) p.set('titled', '1');
  if (f.ownerFinancing) p.set('ownerFinancing', '1');
  if (f.ready && f.type === 'land') p.set('ready', '1');
  if (f.furnished) p.set('furnished', '1');
  if (f.pets) p.set('pets', '1');
  if (f.parking) p.set('parking', '1');
  if (f.ac) p.set('ac', '1');
  put('build', f.build);
  if (f.reduced) p.set('reduced', '1');
  put('days', f.days);
  put('tags', f.tags.join(','));
  put('agentId', f.agentId);
  put('agencyId', f.agencyId);
  put('q', f.q);
  put('sort', f.sort);
  put('bbox', f.bbox);
  return p.toString();
}

type ParamBag = URLSearchParams | Record<string, string | string[] | undefined>;

export function fromParams(bag: ParamBag): Filters {
  const get = (k: string): string => {
    if (bag instanceof URLSearchParams) return bag.get(k) ?? '';
    const v = bag[k];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };
  const arr = (k: string) => (get(k) ? get(k).split(',').filter(Boolean) : []);

  return {
    deal: get('deal'), type: get('type'),
    neighborhoods: arr('neighborhoods'), beds: arr('beds'), bathsMin: get('bathsMin'),
    priceMin: get('priceMin'), priceMax: get('priceMax'),
    sqftMin: get('sqftMin'), sqftMax: get('sqftMax'),
    lotMin: get('lotMin'), lotMax: get('lotMax'),
    hoaMax: get('hoaMax'), yearMin: get('yearMin'),
    oceanfront: get('oceanfront') === '1',
    titled: get('titled') === '1',
    ownerFinancing: get('ownerFinancing') === '1',
    ready: get('ready') === '1',
    furnished: get('furnished') === '1', pets: get('pets') === '1',
    parking: get('parking') === '1', ac: get('ac') === '1',
    build: ['new', 'resale'].includes(get('build')) ? get('build') : '',
    reduced: get('reduced') === '1',
    days: DAYS.includes(get('days')) ? get('days') : '',
    tags: arr('tags'), agentId: get('agentId'), agencyId: get('agencyId'), q: get('q'), sort: get('sort'),
    bbox: parseBbox(get('bbox')) ? get('bbox') : '',
  };
}

/** Скільки фільтрів реально застосовано (для бейджа на кнопці «Filters»). */
export function countActive(f: Filters): number {
  let n = 0;
  if (f.type) n++;
  if (f.neighborhoods.length) n++;
  if (f.beds.length) n++;
  if (f.bathsMin) n++;
  if (f.priceMin || f.priceMax) n++;
  if (f.sqftMin || f.sqftMax) n++;
  if (f.lotMin || f.lotMax) n++;
  if (f.hoaMax !== '') n++;
  if (f.yearMin) n++;
  if (f.oceanfront) n++;
  if (f.titled) n++;
  if (f.ownerFinancing) n++;
  if (f.ready && f.type === 'land') n++;
  for (const k of ['furnished', 'pets', 'parking', 'ac', 'reduced'] as const) if (f[k]) n++;
  if (f.build) n++;
  if (f.days) n++;
  n += f.tags.length;
  if (f.q) n++;
  if (f.bbox) n++;
  return n;
}

/** Сортування — одне на модалку й на список над результатами. */
export const SORTS = [
  { v: '', label: 'Default' },
  { v: 'new', label: 'Newest first' },
  { v: 'price_asc', label: 'Cheapest first' },
  { v: 'price_desc', label: 'Most expensive' },
  { v: 'ppsf_asc', label: 'Lowest price per ft²' },
  { v: 'reduced', label: 'Biggest price drop' },
  { v: 'sqft_desc', label: 'Largest' },
  { v: 'popular', label: 'Most viewed' },
];

/** «Додано за»: доба, тиждень, місяць */
export const DAYS = ['1', '7', '30'];

export type Bbox = [south: number, west: number, north: number, east: number];

/** `south,west,north,east` → числа; криві або перевернуті межі відкидаємо. */
export function parseBbox(v: string | null | undefined): Bbox | undefined {
  if (!v) return undefined;
  const n = v.split(',').map(Number);
  if (n.length !== 4 || !n.every(Number.isFinite)) return undefined;
  const [s, w, no, e] = n;
  if (s >= no || w >= e || s < -90 || no > 90 || w < -180 || e > 180) return undefined;
  return [s, w, no, e];
}

/** Межі карти → рядок для URL. 4 знаки — це ~11 м, точніше не треба, а адреса коротша. */
export function formatBbox(b: Bbox): string {
  return b.map((x) => x.toFixed(4)).join(',');
}

/** Рядок запиту → фільтр для бази. Один розбір на всі місця, де він потрібен. */
export function toListingQuery(sp: URLSearchParams): ListingQuery {
  // NaN з кривого вводу не має доїжджати до бази
  const num = (k: string) => {
    const v = sp.get(k) ? Number(sp.get(k)) : undefined;
    return v !== undefined && Number.isFinite(v) ? v : undefined;
  };
  const list = (k: string) => (sp.get(k) ? sp.get(k)!.split(',').filter(Boolean) : undefined);
  const flag = (k: string) => (sp.get(k) === '1' ? true : undefined);

  return {
    deal: (sp.get('deal') as Deal) || undefined,
    type: (sp.get('type') as PropertyType) || undefined,
    island: sp.get('island') || undefined,
    neighborhoods: list('neighborhoods'),
    beds: list('beds')?.map(Number).filter(Number.isFinite),
    bathsMin: num('bathsMin'),
    priceMin: num('priceMin'),
    priceMax: num('priceMax'),
    sqftMin: num('sqftMin'),
    sqftMax: num('sqftMax'),
    lotMin: num('lotMin'),
    lotMax: num('lotMax'),
    hoaMax: sp.has('hoaMax') ? Number(sp.get('hoaMax')) : undefined,
    yearMin: num('yearMin'),
    oceanfront: flag('oceanfront'),
    titled: flag('titled'),
    ownerFinancing: flag('ownerFinancing'),
    ready: sp.get('type') === 'land' ? flag('ready') : undefined,
    furnished: flag('furnished'),
    pets: flag('pets'),
    parking: flag('parking'),
    ac: flag('ac'),
    build: sp.get('build') === 'new' || sp.get('build') === 'resale' ? (sp.get('build') as 'new' | 'resale') : undefined,
    reduced: flag('reduced'),
    days: DAYS.includes(sp.get('days') ?? '') ? Number(sp.get('days')) : undefined,
    tags: list('tags'),
    q: sp.get('q') || undefined,
    agentId: sp.get('agentId') || undefined,
    agencyId: sp.get('agencyId') || undefined,
    sort: (sp.get('sort') as SortKey) || undefined,
    bbox: parseBbox(sp.get('bbox')),
    ids: list('ids'),
    includeInactive: sp.get('includeInactive') === '1',
  };
}
