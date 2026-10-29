'use client';
import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Deal, Listing, PropertyType } from '@/lib/types';
import { pageList } from './CatalogPager';
import ListingCard from './ListingCard';
import Icon from './Icon';
import { useT } from './LangProvider';

/** 24 ділиться на 2, 3 і 4 колонки — остання лінійка сторінки без дірок */
const PAGE = 24;

const TYPES: { id: PropertyType; label: string }[] = [
  { id: 'condo', label: 'Condos' }, { id: 'house', label: 'Houses' },
  { id: 'land', label: 'Land' }, { id: 'commercial', label: 'Commercial' },
];

type Sort = 'new' | 'price_asc' | 'price_desc';

/** Усі обʼєкти ріелтора на його сторінці: угода, тип, сортування і сторінки — без переходу в пошук. */
export default function AgentListings({ listings, favIds }: { listings: Listing[]; favIds: string[] }) {
  const t = useT();
  const [deal, setDealRaw] = useState<Deal | ''>('');
  const [type, setTypeRaw] = useState<PropertyType | ''>('');
  const [sort, setSortRaw] = useState<Sort>('new');
  // показані сторінки: «Показати ще» додає наступну, номер — переходить на неї (як у DevelopersExplorer)
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const top = useRef<HTMLElement>(null);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setFrom(1); setTo(1); };
  const setDeal = reset(setDealRaw), setType = reset(setTypeRaw), setSort = reset(setSortRaw);

  // нові картки зсувають блоки нижче; без перерахунку ScrollTrigger (див. Motion) вони лишились би прихованими
  useEffect(() => { ScrollTrigger.refresh(); }, [deal, type, sort, from, to]);

  const byDeal = (d: Deal | '') => listings.filter((l) => !d || l.deal === d);
  const deals = (['sale', 'rent'] as const).filter((d) => listings.some((l) => l.deal === d));
  // типи — лише ті, що є у вибраній угоді; один тип — перемикач не потрібен
  const types = TYPES.filter((x) => byDeal(deal).some((l) => l.type === x.id));
  const shown = byDeal(deal).filter((l) => !type || l.type === type);
  // з порядку «нові» база вже віддає; ціну сортуємо тут
  const sorted = sort === 'new' ? shown : [...shown].sort((a, b) => sort === 'price_asc' ? a.price - b.price : b.price - a.price);
  const pages = Math.ceil(sorted.length / PAGE);
  const page = sorted.slice((from - 1) * PAGE, to * PAGE);
  const go = (n: number) => {
    setFrom(n); setTo(n);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!listings.length) {
    return (
      <section className="section agent-list">
        <div className="section__head"><h2>{t('Listings')}</h2></div>
        <div className="empty"><div className="empty__ico"><Icon name="home" size={40} /></div>{t('Nothing listed right now')}</div>
      </section>
    );
  }

  return (
    <section ref={top} className="section agent-list">
      <div className="section__head">
        <h2>{t('Listings')} <span className="agent-list__count">{listings.length}</span></h2>
      </div>

      <div className="agent-list__bar">
        {deals.length > 1 && (
          <div className="chip-row" role="tablist" aria-label={t('Deal')}>
            {(['', ...deals] as const).map((d) => (
              <button key={d || 'all'} type="button" role="tab" aria-selected={deal === d}
                className={`chip-btn${deal === d ? ' is-on' : ''}`}
                onClick={() => { setDeal(d); if (type && !byDeal(d).some((l) => l.type === type)) setTypeRaw(''); }}>
                {d ? t(d === 'sale' ? 'For sale' : 'For rent') : t('All')}
                <span className="agent-list__n">{byDeal(d).length}</span>
              </button>
            ))}
          </div>
        )}
        {types.length > 1 && (
          <div className="chip-row agent-list__types">
            <button type="button" className={`chip-btn${!type ? ' is-on' : ''}`} onClick={() => setType('')}>{t('All types')}</button>
            {types.map((x) => (
              <button key={x.id} type="button" className={`chip-btn${type === x.id ? ' is-on' : ''}`} onClick={() => setType(x.id)}>
                {t(x.label)}
              </button>
            ))}
          </div>
        )}
        <label className="agent-list__sort small muted">
          <Icon name="sort" size={16} />
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('Sort')}>
            <option value="new">{t('Newest first')}</option>
            <option value="price_asc">{t('Cheapest first')}</option>
            <option value="price_desc">{t('Most expensive')}</option>
          </select>
        </label>
      </div>

      <div className="grid grid--4">
        {page.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
      </div>

      {pages > 1 && (
        <div className="cpager">
          {to < pages && (
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setTo(to + 1)}>
              {t('Show more — {n} left', { n: sorted.length - to * PAGE })}
            </button>
          )}
          <nav className="cpager__nav" aria-label={t('Pages')}>
            {from > 1 && <button type="button" className="cpager__step" onClick={() => go(from - 1)}>← {t('Previous')}</button>}
            {pageList(to, pages).map((n, i) => n === null
              ? <span key={`gap-${i}`} className="cpager__gap">…</span>
              : <button key={n} type="button" className={`cpager__num${n >= from && n <= to ? ' is-on' : ''}`}
                  aria-current={n === to ? 'page' : undefined} onClick={() => go(n)}>{n}</button>)}
            {to < pages && <button type="button" className="cpager__step" onClick={() => go(to + 1)}>{t('Next')} →</button>}
          </nav>
        </div>
      )}
    </section>
  );
}
