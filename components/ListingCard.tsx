'use client';
import Link from 'next/link';
import { SQFT_PER_M2, specLine } from '@/lib/format';
import { readiness } from '@/lib/land';
import { statusLabel } from '@/lib/units';
import type { Listing } from '@/lib/types';
import FavButton from './FavButton';
import CompareButton from './CompareButton';
import Icon from './Icon';
import Photo from './Photo';
import { useLang, useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
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
  /** Перша картка на першому екрані: фото вантажимо одразу, а не ліниво (LCP). */
  eager?: boolean;
};

/** «Новое» — опубліковано за останні два тижні */
const NEW_DAYS = 14;
/** «зараз» на момент завантаження модуля: значок «New» не мусить бути точним до секунди */
const NOW = Date.now();

export default function ListingCard({
  listing: l, agentName, isFav, highlighted, ratio = 'wide', onMouseEnter, onMouseLeave, eager,
}: Props) {
  const lp = useLp();
  const t = useT();
  const lang = useLang();
  const money = useMoney();
  const cut = l.oldPrice > l.price && l.price > 0 ? Math.round((1 - l.price / l.oldPrice) * 100) : 0;
  const isNew = NOW - new Date(l.createdAt).getTime() < NEW_DAYS * 86_400_000;
  // ціна за m² — лише для продажу житла з площею; для землі й оренди вона нічого не каже
  const perM2 = l.deal === 'sale' && l.type !== 'land' && l.sqft > 0 ? Math.round((l.price / l.sqft) * SQFT_PER_M2) : 0;
  return (
    <Link
      href={lp(`/listings/${l.id}`)}
      className={`ov ${ratio === 'tall' ? 'ov--tall' : 'ov--wide'} ${highlighted ? 'is-hl' : ''}${l.promo?.includes('highlight') ? ' ov--promo' : ''}${l.sponsored ? ' ov--sponsored' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Photo src={l.photos[0]} alt={l.title} eager={eager} />
      <div className="card__badges">
        {/* платне місце в пошуку підписане чесно — «Sponsored», а не просто Featured */}
        {l.sponsored
          ? <span className="badge badge--sponsored" title={t('Paid placement')}>{t('Sponsored')}</span>
          : l.featured && <span className="badge badge--featured"><Icon name="star" size={12} /> {t('Featured')}</span>}
        {/* продаж — звичайний випадок, підписуємо лише оренду */}
        {l.deal === 'rent' && <span className="badge badge--accent">{t('For rent')}</span>}
        {cut >= 1 && <span className="badge badge--cut">{t('Price cut {n}%', { n: cut })}</span>}
        {isNew && !cut && <span className="badge badge--new">{t('New')}</span>}
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
        <div className="ov__price">
          {money.price(l.price, l.deal, lang)}
          {cut >= 1 && <s className="ov__old">{money.amount(l.oldPrice)}</s>}
          {perM2 > 0 && <span className="ov__ppm">{money.amount(perM2)}/m²</span>}
          {l.photos.length > 1 && (
            <span className="ov__photos" title={t('{n} photos', { n: l.photos.length })}>
              <Icon name="camera" size={13} /> {l.photos.length}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
