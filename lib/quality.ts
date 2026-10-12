import type { Listing } from './types';
import { inAnyRegion } from './regions';

/**
 * Перевірки якості оголошень. Один список і для лічильників на Overview,
 * і для фільтра в таблиці — щоб число та перелік за ним ніколи не розійшлись.
 */
type Checked = Pick<Listing, 'photos' | 'sourceName' | 'type' | 'titled' | 'text' | 'lat' | 'lng'>
  & { land: { checkedAt: string | null } | null };

export const QUALITY_CHECKS = [
  { key: 'noPhotos', filter: 'nophoto', label: 'No photos', option: 'Without photos',
    test: (l: Checked) => l.photos.length === 0 },
  { key: 'noSource', filter: 'nosource', label: 'No source link', option: 'Without a source',
    test: (l: Checked) => !l.sourceName },
  { key: 'untitledLand', filter: 'untitled', label: 'Land, title not confirmed', option: 'Land without title',
    test: (l: Checked) => l.type === 'land' && !l.titled },
  { key: 'thinText', filter: 'thin', label: 'Description under 40 characters', option: 'Short description',
    test: (l: Checked) => l.text.length < 40 },
  { key: 'landUnchecked', filter: 'landunchecked', label: 'Land without a land check', option: 'Land not checked',
    test: (l: Checked) => l.type === 'land' && !l.land?.checkedAt },
  // поза Роатаном, Сан-Педро-Сулою й Тегусігальпою (lib/regions.ts)
  { key: 'offIsland', filter: 'offisland', label: 'Coordinates outside our regions', option: 'Pin outside our regions',
    test: (l: Checked) => !inAnyRegion(l.lat, l.lng) },
] as const;

export type QualityKey = typeof QUALITY_CHECKS[number]['key'];
