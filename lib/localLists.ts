import { useMemo, useSyncExternalStore } from 'react';

/**
 * Списки id оголошень у localStorage цього браузера: збережене гостем, нещодавно переглянуте,
 * порівняння. Сховище може бути вимкнене (приватний режим, заборона кукі) — тоді все тихо
 * працює як порожній список.
 */
export const FAV_KEY = 'resoha:fav';
export const RECENT_KEY = 'resoha:recent';
export const COMPARE_KEY = 'resoha:compare';
type Key = typeof FAV_KEY | typeof RECENT_KEY | typeof COMPARE_KEY;

export const RECENT_MAX = 12;
export const COMPARE_MAX = 4;
const FAV_MAX = 60;
const EVENT = 'resoha:lists';

function raw(key: Key): string {
  try {
    return localStorage.getItem(key) ?? '[]';
  } catch {
    return '[]';
  }
}

function parse(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 64) : [];
  } catch {
    return [];
  }
}

export const readIds = (key: Key) => parse(raw(key));

export function writeIds(key: Key, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(key, JSON.stringify(ids));
    else localStorage.removeItem(key);
  } catch {
    // сховище недоступне — нічого не зберігаємо
  }
  // storage приходить лише з інших вкладок; свою сповіщаємо самі
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* SSR */ }
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Живий список: оновлюється з будь-якої кнопки й з інших вкладок. На сервері — порожній. */
export function useIds(key: Key): string[] {
  // знімок — сирий рядок: рядки порівнюються за значенням, тож React не перемальовує зайвий раз
  const s = useSyncExternalStore(subscribe, () => raw(key), () => '[]');
  return useMemo(() => parse(s), [s]);
}

/** Додає або прибирає id; повертає, чи він тепер у списку. */
export function toggleFav(id: string): boolean {
  const ids = readIds(FAV_KEY);
  const on = !ids.includes(id);
  writeIds(FAV_KEY, on ? [id, ...ids].slice(0, FAV_MAX) : ids.filter((x) => x !== id));
  return on;
}

export function pushRecent(id: string) {
  const ids = readIds(RECENT_KEY);
  if (ids[0] === id) return;
  writeIds(RECENT_KEY, [id, ...ids.filter((x) => x !== id)].slice(0, RECENT_MAX));
}

/** null — у порівнянні вже максимум, нічого не додали. */
export function toggleCompare(id: string): boolean | null {
  const ids = readIds(COMPARE_KEY);
  if (ids.includes(id)) {
    writeIds(COMPARE_KEY, ids.filter((x) => x !== id));
    return false;
  }
  if (ids.length >= COMPARE_MAX) return null;
  writeIds(COMPARE_KEY, [...ids, id]);
  return true;
}
