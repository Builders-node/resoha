import Link from 'next/link';
import Icon from './Icon';
import ListingCard from './ListingCard';
import { DEAL_LABELS, TYPE_LABELS, fmtPrice } from '@/lib/format';
import { areaForNeighborhood } from '@/lib/content/areas';
import type { T } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { Listing } from '@/lib/types';
import type { GoneListing } from '@/lib/gone';

/**
 * «Цей обʼєкт більше недоступний»: замість 404 — що це було і схожі живі обʼєкти поруч.
 * Посилання, що розійшлись месенджерами й пошуком, ведуть покупця далі, а не в нікуди.
 */
export default function ListingGone({ gone, similar, favIds, t, lang }: {
  gone: GoneListing; similar: Listing[]; favIds: string[]; t: T; lang: Lang;
}) {
  const area = areaForNeighborhood(gone.neighborhood);
  const areaHref = area ? `/areas/${area.slug}` : `/listings?deal=${gone.deal}&neighborhoods=${encodeURIComponent(gone.neighborhood)}`;
  const searchHref = `/listings?deal=${gone.deal}&type=${gone.type}&neighborhoods=${encodeURIComponent(gone.neighborhood)}`;
  return (
    <div className="wrap">
      <section className="gone page-top">
        <div className="gone__ico"><Icon name="island" size={40} /></div>
        <h1>{t('This property is no longer available')}</h1>
        <p className="gone__what">
          <b>{gone.title}</b>
          <span className="muted">
            {' · '}{t(TYPE_LABELS[gone.type])} · {t(DEAL_LABELS[gone.deal])} · {gone.neighborhood}
            {gone.price > 0 && <> · {fmtPrice(gone.price, gone.deal, lang)}</>}
          </span>
        </p>
        <p className="muted gone__why">
          {gone.sold
            ? t(gone.deal === 'rent' ? 'It has been rented. Here are similar places that are still on the market.' : 'It has been sold. Here are similar places that are still on the market.')
            : t('The agent has taken it off the market. Here are similar places that are still available.')}
        </p>
        <div className="gone__acts">
          <Link className="btn btn--primary" href={searchHref}>
            {t('See similar in {place}', { place: gone.neighborhood })} <Icon name="arrowRight" size={18} />
          </Link>
          <Link className="btn btn--ghost" href={areaHref}>{t('About {place}', { place: gone.neighborhood })}</Link>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head"><div><h2>{t('Similar listings near {place}', { place: gone.neighborhood })}</h2></div></div>
          <div className="grid grid--4">
            {similar.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
          </div>
        </section>
      )}

      <div className="crumbs crumbs--foot small muted">
        <Link href="/">{t('Home')}</Link> ·{' '}
        <Link href={`/listings?deal=${gone.deal}`}>{t(DEAL_LABELS[gone.deal])}</Link> ·{' '}
        <Link href={areaHref}>{gone.neighborhood}</Link>
      </div>
    </div>
  );
}
