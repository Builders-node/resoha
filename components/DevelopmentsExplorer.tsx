'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from './Icon';
import Photo from './Photo';
import type { Pin } from './MapView';
import { useT } from './LangProvider';

/** ЖК для списку й карти: усе пораховано на сервері. */
export type DevItem = {
  id: string; slug: string; name: string; developer: string; neighborhood: string;
  completion: string; photo?: string; featured: boolean; sales: string;
  units: number; from: string | null; lat: number; lng: number;
};

function MapLoading() {
  const t = useT();
  return <div className="map-skeleton">{t('Loading map…')}</div>;
}

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <MapLoading /> });

/** Сторінка новобудов: ліворуч картки ЖК, праворуч карта з їхніми пінами — як у пошуку. */
export default function DevelopmentsExplorer({ items }: { items: DevItem[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (mobileView !== 'map') return;
    window.scrollTo(0, 0);
    document.body.dataset.mapView = '1';
    return () => { delete document.body.dataset.mapView; };
  }, [mobileView]);

  // без координат ЖК лишається у списку, але на карту не потрапляє;
  // мемо обовʼязкове — новий масив карта сприймає як нову вибірку й перецентровується
  const pins = useMemo<Pin[]>(() => items.filter((d) => d.lat && d.lng).map((d) => ({
    id: d.id, lat: d.lat, lng: d.lng, price: 0, deal: 'sale', label: d.name,
    card: {
      href: `/developments/${d.slug}`,
      title: d.name,
      meta: [d.neighborhood, t('{n} units', { n: d.units }), d.completion].filter(Boolean).join(' · '),
      price: d.from ? t('From {price}', { price: d.from }) : '',
      photo: d.photo,
      badge: t(d.sales),
    },
  })), [items, t]);

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    document.getElementById(`dev-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <>
      <div className={`split split--${mobileView}`} style={{ '--filters-h': '0px' } as React.CSSProperties}>
        <div className="split__list">
          <div className="list-head">
            <h1>{t('New developments')}</h1>
          </div>
          <p className="muted" style={{ margin: '-6px 0 18px' }}>
            {t('Buildings on Roatán with every unit and price in one place.')}{' '}
            <Link className="link-accent" href="/developers">{t('Browse developers')}</Link>
          </p>
          {!items.length && <p className="muted">{t('No developments listed yet.')}</p>}
          <div className="grid grid--list">
            {items.map((d) => (
              <Link key={d.id} id={`dev-${d.id}`} href={`/developments/${d.slug}`}
                className={`ov ov--wide ${activeId === d.id ? 'is-hl' : ''}`}
                onMouseEnter={() => setActiveId(d.id)} onMouseLeave={() => setActiveId(null)}>
                <Photo src={d.photo} alt={d.name} />
                <div className="card__badges">
                  {d.featured && <span className="badge badge--featured"><Icon name="star" size={12} /> {t('Featured')}</span>}
                  <span className="badge badge--brand">{t(d.sales)}</span>
                </div>
                <div className="ov__b">
                  {d.developer && <div className="ov__agency">{d.developer}</div>}
                  <div className="ov__title">{d.name}</div>
                  <div className="ov__meta">{d.neighborhood} · {t('{n} units', { n: d.units })}{d.completion && ` · ${d.completion}`}</div>
                  {d.from && <div className="ov__price">{t('From {price}', { price: d.from })}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="split__map">
          <MapView items={pins} activeId={activeId} onSelect={onSelect} onHover={setActiveId} />
        </div>
      </div>

      <button
        className="view-toggle"
        onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
        aria-label={mobileView === 'list' ? t('Show map') : t('Show list')}
      >
        {mobileView === 'list' ? t('Map') : t('List')}
        <Icon name={mobileView === 'list' ? 'map' : 'list'} size={18} />
      </button>
    </>
  );
}
