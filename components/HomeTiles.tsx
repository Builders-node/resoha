'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { useT } from './LangProvider';
import { REGIONS } from '@/lib/regions';

const SALE_TILES = [
  { label: 'Condos', href: '/listings?deal=sale&type=condo', icon: 'building' },
  { label: 'Houses & villas', href: '/listings?deal=sale&type=house', icon: 'home' },
  { label: 'Land', href: '/listings?deal=sale&type=land', icon: 'land' },
  { label: 'Commercial', href: '/listings?deal=sale&type=commercial', icon: 'briefcase' },
];
const RENT_TILES = [
  { label: 'Condos', href: '/listings?deal=rent&type=condo', icon: 'building' },
  { label: 'Houses', href: '/listings?deal=rent&type=house', icon: 'key' },
];

const KEY = 'home-city';

/**
 * Плитки категорій на головній з вибором міста зверху, як у ЛУН: обране місто
 * додається до кожного посилання (?island=). Вибір памʼятаємо в браузері.
 */
export default function HomeTiles() {
  const t = useT();
  const [city, setCity] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) ?? '';
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage є лише після гідратації
      if (REGIONS.some((r) => r.name === saved)) setCity(saved);
    } catch { /* приватний режим — лишаємо «усі міста» */ }
  }, []);

  function pick(v: string) {
    setCity(v);
    try { localStorage.setItem(KEY, v); } catch { /* не критично */ }
  }

  const withCity = (href: string) => (city ? `${href}&island=${encodeURIComponent(city)}` : href);

  return (
    <div className="tiles-block">
      <select className="input tiles-city" value={city} onChange={(e) => pick(e.target.value)} aria-label={t('City')}>
        <option value="">{t('All cities')}</option>
        {REGIONS.map((r) => <option key={r.slug} value={r.name}>{r.name}</option>)}
      </select>

      <h3>{t('For sale')}</h3>
      <div className="tiles">
        {SALE_TILES.map((tile) => (
          <Link key={tile.label} className="tile" href={withCity(tile.href)}>
            <span className="tile__ico"><Icon name={tile.icon} size={26} /></span>
            <span>{t(tile.label)}</span>
          </Link>
        ))}
      </div>

      <h3>{t('For rent')}</h3>
      <div className="tiles">
        {RENT_TILES.map((tile) => (
          <Link key={tile.label} className="tile tile--wide" href={withCity(tile.href)}>
            <span className="tile__ico"><Icon name={tile.icon} size={26} /></span>
            <span>{t(tile.label)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
