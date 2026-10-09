import { EMPTY_FILTERS, toQuery } from './filters';
import type { Deal } from './types';

/** Вкладки пошуку на головній. new — новобудови: там шукаємо лише ЖК. */
export type SearchTab = 'sale' | 'rent' | 'land' | 'new';
export const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: 'sale', label: 'Buy' }, { id: 'rent', label: 'Rent' }, { id: 'land', label: 'Land' }, { id: 'new', label: 'New builds' },
];
export const isSearchTab = (v: unknown): v is SearchTab => v === 'sale' || v === 'rent' || v === 'land' || v === 'new';

export type Suggestion =
  | { kind: 'area'; label: string; count: number; href: string }
  | { kind: 'development'; label: string; sub: string; href: string }
  | { kind: 'listing'; label: string; sub: string; price: number; deal: Deal; href: string };

/** Вкладка → фільтри каталогу. Посилання будує той самий toQuery, що й каталог. */
export function catalogHref(tab: SearchTab, patch: { neighborhoods?: string[]; q?: string } = {}) {
  const qs = toQuery({
    ...EMPTY_FILTERS,
    deal: tab === 'rent' ? 'rent' : 'sale',
    type: tab === 'land' ? 'land' : '',
    neighborhoods: patch.neighborhoods ?? [],
    q: patch.q ?? '',
  });
  return `/listings?${qs}`;
}
