import Link from 'next/link';
import { DEAL_LABELS, fmtPrice, photoUrl, specLine } from '@/lib/format';
import type { Listing } from '@/lib/types';
import FavButton from './FavButton';

type Props = {
  listing: Listing;
  agentName?: string;
  isFav?: boolean;
  highlighted?: boolean;
  /** tall — вертикальні плитки добірок, wide — сітки списку та «схожого» */
  ratio?: 'tall' | 'wide';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function ListingCard({
  listing: l, agentName, isFav, highlighted, ratio = 'wide', onMouseEnter, onMouseLeave,
}: Props) {
  return (
    <Link
      href={`/listings/${l.id}`}
      className={`ov ${ratio === 'tall' ? 'ov--tall' : 'ov--wide'} ${highlighted ? 'is-hl' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" src={photoUrl(l.photos[0], 700, ratio === 'tall' ? 900 : 560)} alt={l.title} />
      <div className="card__badges">
        <span className={`badge ${l.deal === 'rent' ? 'badge--accent' : 'badge--brand'}`}>{DEAL_LABELS[l.deal]}</span>
        {l.oceanfront && <span className="badge">Oceanfront</span>}
        {l.type === 'land' && l.titled && <span className="badge">Titled</span>}
      </div>
      <FavButton listingId={l.id} initial={isFav} />
      <div className="ov__b">
        {agentName && <div className="ov__agency">{agentName}</div>}
        <div className="ov__title">{l.title}</div>
        <div className="ov__meta">{l.neighborhood} · {specLine(l)}</div>
        <div className="ov__price">{fmtPrice(l.price, l.deal)}</div>
      </div>
    </Link>
  );
}
