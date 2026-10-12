'use client';
import { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { PROMO_PRODUCTS, type PromoKind, type PromoProduct } from '@/lib/promoShared';
import type { Listing } from '@/lib/types';

/** Де покупець побачить просування — підпис під прев'ю для кожного виду. */
const WHERE: Record<PromoProduct, string> = {
  featured: 'In lists and search the card carries a Featured badge and goes first.',
  top: 'Shown in one of the two Sponsored places above matching search results.',
  highlight: 'The card gets a coloured frame in every list it appears in.',
  homepage: 'The card appears among the Featured homes on the home page.',
  bump: 'The listing moves to the top of “Newest”, as if it was just published.',
  premium_agent: 'Buyers on the listing page see only you, without other agents’ listings next to it.',
};

/**
 * Прев'ю перед оплатою: справжня картка оголошення з тим виглядом, який дасть обраний вид.
 * Для ЖК, домів і агенцій — лише підпис, де їх побачать.
 */
export default function PromoPreview({ kind, targetId, product }: { kind: PromoKind; targetId: string; product: PromoProduct }) {
  const [loaded, setLoaded] = useState<{ id: string; listing: Listing | null } | null>(null);

  useEffect(() => {
    if (kind !== 'listing' || !targetId) return;
    let alive = true;
    fetch(`/api/listings/${targetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setLoaded({ id: targetId, listing: d?.listing ?? null }); })
      .catch(() => { if (alive) setLoaded({ id: targetId, listing: null }); });
    return () => { alive = false; };
  }, [kind, targetId]);

  const listing = kind === 'listing' && loaded?.id === targetId ? loaded.listing : null;
  const preview: Listing | null = listing && {
    ...listing,
    featured: product === 'featured' || product === 'homepage' || listing.featured,
    sponsored: product === 'top',
    promo: product === 'highlight' ? [...(listing.promo ?? []), 'highlight'] : listing.promo,
  };

  return (
    <div className="promo-preview">
      {preview && (
        <div className="promo-preview__card" aria-hidden="true" inert>
          <ListingCard listing={preview} />
        </div>
      )}
      <p className="small">
        <b>{PROMO_PRODUCTS[product].label}.</b> <span className="muted">{WHERE[product]}</span>
      </p>
    </div>
  );
}
