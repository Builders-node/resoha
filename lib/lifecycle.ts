import type { Listing } from './types';

/**
 * Де оголошення в життєвому циклі (міграція 0049) — одна відповідь і для кабінету, і для сторінки обʼєкта.
 * Строк — 90 днів від публікації; за 14 днів до кінця пропонуємо продовжити.
 */
export const LISTING_TERM_DAYS = 90;
export const RENEW_WINDOW_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export type Lifecycle = {
  key: 'draft' | 'pending' | 'rejected' | 'expired' | 'hidden' | 'live';
  label: string;
  /** Чи бачать його покупці зараз */
  public: boolean;
  /** Днів до кінця показу (лише для опублікованого зі строком) */
  daysLeft: number | null;
  canRenew: boolean;
  /** Чернетку чи відхилене можна (знову) надіслати на публікацію */
  canSubmit: boolean;
};

export function lifecycle(l: Pick<Listing, 'review' | 'active' | 'expiresAt'>, now = Date.now()): Lifecycle {
  const left = l.expiresAt ? Math.ceil((Date.parse(l.expiresAt) - now) / DAY) : null;
  const base = { daysLeft: null, canRenew: false, canSubmit: false, public: false };
  if (l.review === 'draft') return { ...base, key: 'draft', label: 'Draft', canSubmit: true };
  if (l.review === 'pending') return { ...base, key: 'pending', label: 'In review' };
  if (l.review === 'rejected') return { ...base, key: 'rejected', label: 'Needs changes', canSubmit: true };
  if (left !== null && left <= 0) return { ...base, key: 'expired', label: 'Expired', canRenew: true };
  const canRenew = left !== null && left <= RENEW_WINDOW_DAYS;
  if (!l.active) return { ...base, key: 'hidden', label: 'Hidden', daysLeft: left, canRenew };
  return { ...base, key: 'live', label: 'Live', public: true, daysLeft: left, canRenew };
}

/** Нова дата кінця при продовженні: +90 днів від сьогодні (база не дасть більше). */
export const renewedUntil = (now = Date.now()) => new Date(now + LISTING_TERM_DAYS * DAY).toISOString();
