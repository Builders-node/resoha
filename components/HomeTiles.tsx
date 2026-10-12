'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useT } from './LangProvider';
import { useLp } from './useLp';
import { CITY_COOKIE, REGIONS } from '@/lib/regions';

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

/**
 * Плитки категорій на головній з вибором міста зверху, як у ЛУН. Місто перемикає всю
 * головну: сторінка перечитується з ?city=, а вибір лишається в cookie для наступних візитів.
 */
export default function HomeTiles({ city }: { city: string }) {
  const t = useT();
  const lp = useLp();
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(name: string) {
    const slug = REGIONS.find((r) => r.name === name)?.slug ?? 'all';
    document.cookie = `${CITY_COOKIE}=${slug === 'all' ? '' : slug}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.push(lp(`/?city=${slug}`), { scroll: false }));
  }

  const withCity = (href: string) => (city ? `${href}&island=${encodeURIComponent(city)}` : href);

  return (
    <div className="tiles-block">
      <select className="input tiles-city" value={city} onChange={(e) => pick(e.target.value)} aria-label={t('City')}
        disabled={pending} aria-busy={pending}>
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
