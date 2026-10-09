'use client';
import { useState } from 'react';
import { HeartIcon } from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { FAV_KEY, toggleFav, useIds } from '@/lib/localLists';

export default function FavButton({ listingId, initial = false, className = 'fav', size = 18 }: {
  listingId: string; initial?: boolean; className?: string; size?: number;
}) {
  const t = useT();
  const [server, setServer] = useState(initial);
  // гість зберігає в цьому браузері; після входу GuestFavSync переносить список в акаунт
  const local = useIds(FAV_KEY).includes(listingId);
  const on = server || local;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    }).catch(() => null);
    if (!res || res.status === 401) {
      const added = toggleFav(listingId);
      toast(added ? t('Saved on this device. Sign in to keep it in your account') : t('Removed from saved'));
      return;
    }
    // роут відповідає { on }, а не { added } — через це серце не зафарбовувалось
    const { on: added } = await res.json();
    setServer(added);
    toast(added ? t('Saved to your account') : t('Removed from saved'));
  }

  return (
    <button className={`${className} ${on ? 'is-on' : ''}`} onClick={toggle} aria-label={t('Save listing')} title={t('Save listing')}
      aria-pressed={on}>
      <HeartIcon filled={on} size={size} />
    </button>
  );
}
