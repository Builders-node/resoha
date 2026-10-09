'use client';
import Link from 'next/link';
import { DEAL_LABELS, fmtPrice, specLine } from '@/lib/format';
import { readiness } from '@/lib/land';
import { statusLabel } from '@/lib/units';
import type { Listing } from '@/lib/types';
import FavButton from './FavButton';
import CompareButton from './CompareButton';
import Icon from './Icon';
import Photo from './Photo';
import { useLang, useT } from './LangProvider';
import { useLp } from './useLp';

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
  const lp = useLp();
  const t = useT();
  const lang = useLang();
  return (
    <Link
      href={lp(`/listings/${l.id}`)}
      className={`ov ${ratio === 'tall' ? 'ov--tall' : 'ov--wide'} ${highlighted ? 'is-hl' : ''}${l.promo?.includes('highlight') ? ' ov--promo' : ''}${l.sponsored ? ' ov--sponsored' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Photo src={l.photos[0]} alt={l.title} />
      <div className="card__badges">
        {/* платне місце в пошуку підписане чесно — «Sponsored», а не просто Featured */}
        {l.sponsored
          ? <span className="badge badge--sponsored" title={t('Paid placement')}>{t('Sponsored')}</span>
          : l.featured && <span className="badge badge--featured"><Icon name="star" size={12} /> {t('Featured')}</span>}
        <span className={`badge ${l.deal === 'rent' ? 'badge--accent' : 'badge--brand'}`}>{t(DEAL_LABELS[l.deal])}</span>
        {l.status !== 'available' && <span className="badge">{t(statusLabel(l.status))}</span>}
        {l.oceanfront && <span className="badge">{t('Oceanfront')}</span>}
        {/* земля: один бейдж готовності замість «Titled»; без перевірки — нічого */}
        {l.type === 'land' && l.land?.checkedAt && (
          <span className={`badge badge--${readiness(l.land).tone}`}>{t(readiness(l.land).label)}</span>
        )}
        {l.type === 'land' && !l.land?.checkedAt && l.titled && <span className="badge">{t('Titled')}</span>}
      </div>
      <FavButton listingId={l.id} initial={isFav} />
      <CompareButton listingId={l.id} />
      <div className="ov__b">
        {l.development
          ? <div className="ov__agency">{l.development.name}{l.unitNo && ` · ${t('Unit {n}', { n: l.unitNo })}`}</div>
          : agentName && <div className="ov__agency">{agentName}</div>}
        <div className="ov__title">{l.title}</div>
        <div className="ov__meta">{l.neighborhood} · {specLine(l, lang)}</div>
        <div className="ov__price">{fmtPrice(l.price, l.deal, lang)}</div>
      </div>
    </Link>
  );
}
