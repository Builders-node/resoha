import Icon from './Icon';
import Photo from './Photo';
import { fmtUsd } from '@/lib/format';
import { rentalsLabel } from '@/lib/units';
import type { Building, Development, Listing } from '@/lib/types';

/** Рядок характеристики: іконка, значення, підпис */
export type Feature = [icon: string, value: string, label: string];

const range = (xs: number[]) =>
  !xs.length ? '' : Math.min(...xs) === Math.max(...xs) ? String(xs[0]) : `${Math.min(...xs)}–${Math.max(...xs)}`;

/**
 * «Характеристики проєкту» ЖК — однаково на сторінці ЖК і на сторінці квартири в ньому.
 * Поверхи — з домів, якщо задані, інакше з ЖК чи з поверхів квартир. Порожнє не показуємо.
 */
export function developmentFeatures(dev: Development, buildings: Building[], units: Listing[]): Feature[] {
  const floors = range(buildings.flatMap((b) => (b.floors ? [b.floors] : [])))
    || (dev.floors ? String(dev.floors) : range(units.flatMap((u) => (u.floor !== null ? [u.floor] : []))));
  const list: Feature[] = [
    ['star', dev.projectClass, 'class'],
    ['building', buildings.length ? String(buildings.length) : '', buildings.length === 1 ? 'building' : 'buildings'],
    ['layers', floors, 'floors'],
    ['crane', dev.construction, 'construction'],
    ['bricks', dev.walls, 'walls'],
    ['shieldHome', dev.insulation, 'insulation'],
    ['snow', dev.climate, 'cooling & heating'],
    ['height', dev.ceiling, 'ceiling height'],
    ['grid', units.length ? String(units.length) : '', 'units'],
    ['brush', dev.finish, 'finish'],
    ['fence', dev.territory, 'grounds'],
    ['car', dev.parking, 'parking'],
    ['bolt', dev.backupPower, 'backup power'],
    ['drop', dev.water, 'water supply'],
    ['wallet', dev.hoa !== null ? (dev.hoa ? `${fmtUsd(dev.hoa)}/mo` : 'None') : '', 'HOA fees'],
    ['key', dev.rentals ? rentalsLabel(dev.rentals) : '', 'rentals'],
    ['briefcase', dev.developer, 'developer'],
    ['calendar', dev.completion, 'completion'],
  ];
  return list.filter((f) => Boolean(f[1]));
}

/** Сітка характеристик у три колонки */
export function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <ul className="feat__grid">
      {items.map(([icon, value, label]) => (
        <li key={label}><Icon name={icon} size={26} /><div><b>{value}</b><span>{label}</span></div></li>
      ))}
    </ul>
  );
}

/** Стрічка фото з прокруткою — без клієнтського JS (scroll-snap) */
export function PhotoStrip({ photos, title }: { photos: string[]; title: string }) {
  if (!photos.length) return null;
  return (
    <div className="pstrip" tabIndex={0} aria-label={`${title} photos`}>
      {photos.map((p, i) => (
        <div key={`${i}-${p}`} className="pstrip__item"><Photo src={p} alt={`${title} — photo ${i + 1}`} /></div>
      ))}
    </div>
  );
}
