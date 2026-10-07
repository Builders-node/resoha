'use client';
import { useState } from 'react';
import { HeartIcon } from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';

export default function FavButton({ listingId, initial = false, className = 'fav', size = 18 }: {
  listingId: string; initial?: boolean; className?: string; size?: number;
}) {
  const t = useT();
  const [on, setOn] = useState(initial);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    });
    if (res.status === 401) { toast(t('Sign in to save listings')); return; }
    // роут відповідає { on }, а не { added } — через це серце не зафарбовувалось
    const { on: added } = await res.json();
    setOn(added);
    toast(added ? t('Saved to your account') : t('Removed from saved'));
  }

  return (
    <button className={`${className} ${on ? 'is-on' : ''}`} onClick={toggle} aria-label={t('Save listing')} title={t('Save listing')}>
      <HeartIcon filled={on} size={size} />
    </button>
  );
}
