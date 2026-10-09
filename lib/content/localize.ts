import type { T } from '../i18n';

/** Поля, які не перекладаємо: адреси, ідентифікатори, дати, назви районів для запитів і джерела. */
const KEEP = new Set(['slug', 'id', 'icon', 'published', 'updated', 'related', 'neighborhoods', 'url', 'path', 'href',
  'sources', 'priceSource', 'source']);

/**
 * Проганяє весь текст контенту (гайд, район, розділ довідки) через t(): переклад лежить
 * у lib/i18n/es/content.ts, ключ — англійський рядок. Чого немає в словнику, лишається англійським.
 * JSON-LD сторінки будують з англійського оригіналу — локалізуємо лише те, що бачить людина.
 */
export function localizeContent<V>(v: V, t: T): V {
  if (typeof v === 'string') return t(v) as V;
  if (Array.isArray(v)) return v.map((x) => localizeContent(x, t)) as V;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, KEEP.has(k) ? x : localizeContent(x, t)])) as V;
  }
  return v;
}
