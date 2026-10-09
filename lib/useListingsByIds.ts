import { useEffect, useState } from 'react';
import type { Listing } from './types';

type Cache = { items: Record<string, Listing>; tried: Record<string, true> };

/**
 * Оголошення за списком id з localStorage, у порядку цього списку. Тягнемо лише ті, яких ще
 * немає: прибрали одне з порівняння — повторного запиту немає. Зняті з публікації чи продані
 * /api/listings не віддає, вони просто випадають.
 */
export function useListingsByIds(ids: string[]) {
  const [cache, setCache] = useState<Cache>({ items: {}, tried: {} });
  const missing = ids.filter((id) => !cache.tried[id]);
  const key = missing.join(',');

  useEffect(() => {
    if (!key) return;
    let off = false;
    const want = key.split(',');
    fetch(`/api/listings?ids=${encodeURIComponent(key)}&pageSize=60`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .catch(() => ({ items: [] }))
      .then((d: { items?: Listing[] }) => {
        if (off) return;
        setCache((c) => {
          const items = { ...c.items };
          const tried = { ...c.tried };
          (d.items ?? []).forEach((l) => { items[l.id] = l; });
          want.forEach((id) => { tried[id] = true; });
          return { items, tried };
        });
      });
    return () => { off = true; };
  }, [key]);

  return {
    items: ids.map((id) => cache.items[id]).filter((l): l is Listing => Boolean(l)),
    loading: missing.length > 0,
  };
}
