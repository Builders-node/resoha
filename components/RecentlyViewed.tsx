'use client';
import { useEffect } from 'react';
import ListingCard from './ListingCard';
import { useT } from './LangProvider';
import { RECENT_KEY, pushRecent, useIds, writeIds } from '@/lib/localLists';
import { useListingsByIds } from '@/lib/useListingsByIds';

/** Ставиться на сторінку оголошення: запамʼятовує перегляд у цьому браузері. */
export function RecordView({ id }: { id: string }) {
  useEffect(() => { pushRecent(id); }, [id]);
  return null;
}

/**
 * Ряд «Recently viewed». Порожній список — нічого не малюємо, тож блок не займає місця
 * ні на сервері, ні в першого відвідувача.
 */
export default function RecentlyViewed({ favIds = [], variant = 'home', limit = 4 }: {
  favIds?: string[];
  /** home — секція з сіткою на 4; list — блок у колонці каталогу */
  variant?: 'home' | 'list';
  limit?: number;
}) {
  const t = useT();
  const ids = useIds(RECENT_KEY);
  const { items } = useListingsByIds(ids);
  const shown = items.slice(0, limit);
  if (!shown.length) return null;

  const head = (
    <div className="section__head">
      <h2>{t('Recently viewed')}</h2>
      <button className="btn btn--ghost btn--sm" onClick={() => writeIds(RECENT_KEY, [])}>{t('Clear history')}</button>
    </div>
  );

  if (variant === 'list') {
    return (
      <section className="recent recent--list">
        {head}
        <div className="grid grid--list">
          {shown.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
        </div>
      </section>
    );
  }
  return (
    <section className="section recent">
      <div className="wrap">
        {head}
        <div className="grid grid--4">
          {shown.map((l) => <ListingCard key={l.id} listing={l} ratio="tall" isFav={favIds.includes(l.id)} />)}
        </div>
      </div>
    </section>
  );
}
