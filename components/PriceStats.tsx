'use client';
import Link from 'next/link';
import Icon from './Icon';
import Logo from './Logo';
import { useLang, useT } from './LangProvider';
import { fmtNumber } from '@/lib/format';
import { intlLocale } from '@/lib/i18n';
import type { CityStat, PriceStats, RoomStat, StatValue } from '@/lib/priceStats';
import type { Deal } from '@/lib/types';
import type { Money } from '@/lib/currency';
import { useMoney } from './CurrencyProvider';

/** $283K, $1.2M, $1.5K — як «25к грн» у ЛУН; в іншій валюті — «≈ €260K» */
function fmtCompact(v: number, money: Money) {
  const s = money.symbol;
  const x = money.fromUsd(v);
  const cut = (n: number, unit: string) => `${money.converted ? '≈ ' : ''}${s}${(n >= 100 ? Math.round(n) : Math.round(n * 10) / 10)}${unit}`;
  if (x >= 1_000_000) return cut(x / 1_000_000, 'M');
  if (x >= 1_000) return cut(x / 1_000, 'K');
  return cut(x, '');
}

/** «+4%» / «-5%»; бейджа немає, поки історії замало */
function Change({ change, digits = 0 }: { change: number | null; digits?: number }) {
  if (change === null) return null;
  const pct = digits ? change.toFixed(digits) : String(Math.round(change));
  return (
    <span className={`pstat-badge ${change < 0 ? 'is-down' : 'is-up'}`}>
      {change > 0 ? '+' : ''}{pct.replace('-', '−')}%
    </span>
  );
}

const tone = (s: StatValue) => (s.change === null || Math.round(s.change) === 0 ? '' : s.change > 0 ? 'is-up' : 'is-down');

/**
 * Каталог: медіанна ціна за кількістю спалень зі зміною за рік. Клік по картці
 * фільтрує список за цими спальнями — як у ЛУН.
 */
export function RoomPriceStats({ deal, stats, onPick }: {
  deal: Deal; stats: RoomStat[]; onPick: (beds: string[]) => void;
}) {
  const t = useT();
  const money = useMoney();
  if (stats.length < 2) return null;
  const label = (beds: number) => (beds === 0 ? t('Studios') : beds === 3 ? t('3+ bedrooms') : beds === 1 ? t('1 bedroom') : t('{n} bedrooms', { n: beds }));

  return (
    <section className="pstat" aria-label={t('Price statistics')}>
      <div className="pstat__head">
        <h2>{deal === 'rent' ? t('Rent price statistics') : t('Home price statistics')}</h2>
        <Link className="btn btn--primary pstat__more" href="/market" aria-label={t('Market report')}>
          <Icon name="arrowRight" size={20} />
        </Link>
      </div>
      <div className="pstat__grid">
        {stats.map((s) => (
          <button key={s.beds} type="button" className={`pstat__card ${tone(s)}`}
            onClick={() => onPick(s.beds === 3 ? ['3', '4'] : [String(s.beds)])}>
            <span className="pstat__k">{label(s.beds)}</span>
            <span className="pstat__v">{fmtCompact(s.value, money)}{deal === 'rent' && <small>{t('/mo')}</small>}</span>
            {s.change !== null && (
              <span className="pstat__ch"><Change change={s.change} /> <span>{t('in a year')}</span></span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function CityRow({ label, stat, since, lead }: { label: string; stat: StatValue; since: string; lead?: boolean }) {
  const t = useT();
  const money = useMoney();
  return (
    <div className={`city-stat__row ${lead ? 'is-lead' : ''}`}>
      <span className="city-stat__k">{label}</span>
      <span className="city-stat__v"><b>{money.converted && '≈ '}{fmtNumber(Math.round(money.fromUsd(stat.value)))}</b><small>{money.symbol.trim()}/m²</small></span>
      <span className="city-stat__ch">
        <Change change={stat.change} digits={1} />
        {stat.change !== null && <small>{t('vs {date}', { date: since })}</small>}
      </span>
    </div>
  );
}

/** Головна: темні картки міст із медіанною ціною за m² і розбивкою за типом житла */
export function CityPriceStats({ cities, period }: { cities: CityStat[]; period: PriceStats }) {
  const t = useT();
  const lang = useLang();
  if (!cities.length) return null;
  const month = new Date(period.month).toLocaleDateString(intlLocale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const s = new Date(period.since);
  const since = `${String(s.getUTCMonth() + 1).padStart(2, '0')}.${s.getUTCFullYear()}`;

  return (
    <section className="section section--soft">
      <div className="wrap">
        <div className="section__head section__head--start">
          <h2>{t('Resoha statistics')}</h2>
          <Link className="btn btn--primary" href="/market">{t('Market report')} <Icon name="arrowRight" size={18} /></Link>
        </div>
        <div className="city-stats">
          {cities.map((c) => (
            <article key={c.name} className="city-stat">
              <div className="city-stat__top">
                <div className="city-stat__title">
                  <h3>{c.name}</h3>
                  <span className="city-stat__brand"><Logo size={22} /> Resoha</span>
                </div>
                <span className="city-stat__month">{month}</span>
                <CityRow label={t('Median price')} stat={c.all} since={since} lead />
              </div>
              <div className="city-stat__bottom">
                {c.rows.map((r) => (
                  <CityRow key={r.type} label={r.type === 'condo' ? t('Condos') : t('Houses & villas')} stat={r.stat} since={since} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
