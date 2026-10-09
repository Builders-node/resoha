'use client';
import Icon from './Icon';
import { useT } from './LangProvider';
import type { Filters } from '@/lib/filters';
import { fmtNumber } from '@/lib/format';
import { useMoney } from './CurrencyProvider';

const TYPE: Record<string, string> = { condo: 'Condos', house: 'Houses & villas', land: 'Land', commercial: 'Commercial' };
const HOA: Record<string, string> = { '0': 'No HOA' };
const DAYS: Record<string, string> = { '1': 'Added today', '7': 'Added this week', '30': 'Added this month' };

type Chip = { key: string; label: string; clear: Partial<Filters> };

/** Що зараз увімкнено — чипами з хрестиком під панеллю фільтрів, щоб зняти одне, не відкриваючи модалку. */
export default function FilterChips({ filters: f, onChange, onReset }: {
  filters: Filters; onChange: (patch: Partial<Filters>) => void; onReset: () => void;
}) {
  const t = useT();
  const money = useMoney();
  const chips: Chip[] = [];
  const add = (key: string, label: string, clear: Partial<Filters>) => chips.push({ key, label, clear });
  const range = (lo: string, hi: string, fmt: (v: number) => string) =>
    lo && hi ? `${fmt(Number(lo))} – ${fmt(Number(hi))}` : lo ? t('from {v}', { v: fmt(Number(lo)) }) : t('up to {v}', { v: fmt(Number(hi)) });

  if (f.q) add('q', `“${f.q}”`, { q: '' });
  if (f.type) add('type', t(TYPE[f.type] ?? f.type), { type: '', ready: false });
  for (const n of f.neighborhoods) add(`n-${n}`, n, { neighborhoods: f.neighborhoods.filter((x) => x !== n) });
  if (f.priceMin || f.priceMax) add('price', range(f.priceMin, f.priceMax, money.amount), { priceMin: '', priceMax: '' });
  if (f.beds.length) add('beds', t('{n} bd', { n: f.beds.map((b) => (b === '4' ? '4+' : b)).join(', ') }), { beds: [] });
  if (f.bathsMin) add('baths', t('{n}+ baths', { n: f.bathsMin }), { bathsMin: '' });
  if (f.sqftMin || f.sqftMax) add('sqft', `${range(f.sqftMin, f.sqftMax, fmtNumber)} ft²`, { sqftMin: '', sqftMax: '' });
  if (f.lotMin || f.lotMax) add('lot', t('{range} ac', { range: range(f.lotMin, f.lotMax, (v) => String(v)) }), { lotMin: '', lotMax: '' });
  if (f.hoaMax !== '') add('hoa', t(HOA[f.hoaMax] ?? 'HOA under {v}', { v: money.amount(Number(f.hoaMax)) }), { hoaMax: '' });
  if (f.yearMin) add('year', t('Built {year}+', { year: f.yearMin }), { yearMin: '' });
  if (f.build) add('build', t(f.build === 'new' ? 'New build' : 'Resale'), { build: '' });
  if (f.reduced) add('reduced', t('Price reduced'), { reduced: false });
  if (f.days) add('days', t(DAYS[f.days] ?? 'Added recently'), { days: '' });
  if (f.oceanfront) add('ocean', t('Oceanfront'), { oceanfront: false });
  if (f.ready && f.type === 'land') add('ready', t('Ready to build'), { ready: false });
  if (f.titled) add('titled', t('Free & clear title'), { titled: false });
  if (f.ownerFinancing) add('of', t('Owner financing'), { ownerFinancing: false });
  if (f.furnished) add('furnished', t('Furnished'), { furnished: false });
  if (f.pets) add('pets', t('Pets allowed'), { pets: false });
  if (f.parking) add('parking', t('Parking'), { parking: false });
  if (f.ac) add('ac', t('Air conditioning'), { ac: false });
  for (const tag of f.tags) add(`t-${tag}`, t(tag), { tags: f.tags.filter((x) => x !== tag) });
  if (f.bbox) add('bbox', t('Map area'), { bbox: '' });

  if (!chips.length) return null;
  return (
    <div className="fchips">
      {chips.map((c) => (
        <button key={c.key} type="button" className="fchip" onClick={() => onChange(c.clear)}
          aria-label={t('Remove filter: {name}', { name: c.label })}>
          {c.label} <Icon name="close" size={13} />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="fchip fchip--reset" onClick={onReset}>{t('Clear all')}</button>
      )}
    </div>
  );
}
