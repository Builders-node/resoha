'use client';
import { useState } from 'react';
import { HeartIcon } from './Icon';
import { toast } from './Toaster';

export default function FavButton({ listingId, initial = false, className = 'fav', size = 18 }: {
  listingId: string; initial?: boolean; className?: string; size?: number;
}) {
  const [on, setOn] = useState(initial);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    });
    if (res.status === 401) { toast('Sign in to save listings'); return; }
    const { added } = await res.json();
    setOn(added);
    toast(added ? 'Saved to your account' : 'Removed from saved');
  }

  return (
    <button className={`${className} ${on ? 'is-on' : ''}`} onClick={toggle} aria-label="Save listing" title="Save listing">
      <HeartIcon filled={on} size={size} />
    </button>
  );
}
