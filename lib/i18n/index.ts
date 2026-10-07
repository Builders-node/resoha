import { ES } from './es';

/**
 * Мови інтерфейсу. Ключ перекладу — сам англійський рядок: так код читається як раніше,
 * а відсутній переклад просто лишає англійський текст. Оголошення ріелторів не перекладаємо.
 */
export type Lang = 'en' | 'es';
export const LANGS: Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_COOKIE = 'lang';

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'es';

/** Локаль для Intl (дати, числа). */
export const intlLocale = (lang: Lang) => (lang === 'es' ? 'es-HN' : 'en-US');

export type Vars = Record<string, string | number>;
export type T = (en: string, vars?: Vars) => string;

/** Підставляє {name} у рядок. */
const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

export function translate(lang: Lang, en: string, vars?: Vars): string {
  return fill(lang === 'es' ? (ES[en] ?? en) : en, vars);
}

export const makeT = (lang: Lang): T => (en, vars) => translate(lang, en, vars);
