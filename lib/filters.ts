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
  tags: string[];
  agentId: string;
  agencyId: string;
  q: string;
  sort: string;
};

export const EMPTY_FILTERS: Filters = {
  deal: '', type: '', neighborhoods: [], beds: [], bathsMin: '',
  priceMin: '', priceMax: '', sqftMin: '', sqftMax: '', lotMin: '', lotMax: '',
  hoaMax: '', yearMin: '', oceanfront: false, titled: false, ownerFinancing: false,
  tags: [], agentId: '', agencyId: '', q: '', sort: '',
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
  put('tags', f.tags.join(','));
  put('agentId', f.agentId);
  put('agencyId', f.agencyId);
  put('q', f.q);
  put('sort', f.sort);
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
    tags: arr('tags'), agentId: get('agentId'), agencyId: get('agencyId'), q: get('q'), sort: get('sort'),
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
  n += f.tags.length;
  if (f.q) n++;
  return n;
}
