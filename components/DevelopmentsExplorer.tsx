'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from './Icon';
import Photo from './Photo';
import type { Pin } from './MapView';
import { useT } from './LangProvider';
import { SALES_STATUSES } from '@/lib/units';
import { useMoney } from './CurrencyProvider';

/** ЖК для списку й карти: усе пораховано на сервері. */
export type DevItem = {
  id: string; slug: string; name: string; developer: string; neighborhood: string;
  completion: string; photo?: string; featured: boolean; sales: string; salesKey: string;
  units: number; from: string | null; fromValue: number | null; lat: number; lng: number;
};

/** Рік здачі з довільного рядка забудовника: «Q3 2027», «2026», «Ready» → 2027 / 2026 / null */
const yearOf = (completion: string) => Number(completion.match(/20\d\d/)?.[0]) || null;
const PRICE_CAPS = [150000, 250000, 500000, 1000000];

function MapLoading() {
  const t = useT();
  return <div className="map-skeleton">{t('Loading map…')}</div>;
}

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <MapLoading /> });

/** Сторінка новобудов: ліворуч картки ЖК, праворуч карта з їхніми пінами — як у пошуку. */
export default function DevelopmentsExplorer({ items: all }: { items: DevItem[] }) {
  const t = useT();
  const money = useMoney();
  const [year, setYear] = useState('');
  const [area, setArea] = useState('');
  const [cap, setCap] = useState('');
  const [sales, setSales] = useState('');

  const years = useMemo(() => [...new Set(all.map((d) => yearOf(d.completion)).filter(Boolean) as number[])].sort(), [all]);
  const areas = useMemo(() => [...new Set(all.map((d) => d.neighborhood).filter(Boolean))].sort(), [all]);
  const items = useMemo(() => all.filter((d) =>
    (!year || (year === 'ready' ? (yearOf(d.completion) ?? 0) <= new Date().getFullYear() && Boolean(yearOf(d.completion)) : yearOf(d.completion) === Number(year)))
    && (!area || d.neighborhood === area)
    && (!cap || (d.fromValue !== null && d.fromValue <= Number(cap)))
    && (!sales || d.salesKey === sales),
  ), [all, year, area, cap, sales]);
  const filtered = Boolean(year || area || cap || sales);
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
          {all.length > 0 && (
            <div className="fsel-row">
              <label>{t('Completion')}
                <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">{t('Any year')}</option>
                  <option value="ready">{t('Completed')}</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label>{t('Area')}
                <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">{t('All areas')}</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label>{t('Prices from')}
                <select className="input" value={cap} onChange={(e) => setCap(e.target.value)}>
                  <option value="">{t('Any price')}</option>
                  {PRICE_CAPS.map((p) => <option key={p} value={p}>{t('under {price}', { price: money.amount(p) })}</option>)}
                </select>
              </label>
              <label>{t('Sales')}
                <select className="input" value={sales} onChange={(e) => setSales(e.target.value)}>
                  <option value="">{t('Any status')}</option>
                  {SALES_STATUSES.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
                </select>
              </label>
            </div>
          )}
          {!all.length && <p className="muted">{t('No developments listed yet.')}</p>}
          {all.length > 0 && !items.length && (
            <p className="muted">
              {t('No developments match these filters.')}{' '}
              {filtered && (
                <button type="button" className="link-accent" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                  onClick={() => { setYear(''); setArea(''); setCap(''); setSales(''); }}>{t('Clear filters')}</button>
              )}
            </p>
          )}
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
