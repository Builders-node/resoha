'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import Icon from './Icon';
import Photo from './Photo';
import { useT } from './LangProvider';
import { useLp } from './useLp';
import { photoUrl } from '@/lib/format';

export type DevCard = {
  id: string;
  slug: string;
  name: string;
  logo: string;
  verified: boolean;
  founded: number | null;
  projects: { name: string; city: string }[];
  cover: string;   // фото першого ЖК, у якого воно є
};

const initials = (name: string) =>
  name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter((w) => /^[\p{L}\d]/u.test(w)).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase() || '·';

/** Логотипи бувають будь-яких пропорцій — вписуємо в світлу плитку; без логотипу або якщо він не завантажився — ініціали. */
function DevLogo({ src, name, className = '' }: { src: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? '' : photoUrl(src);
  return (
    <div className={`devc__logo${url ? '' : ' devc__logo--ini'} ${className}`.trim()}>
      {url
        ? <img src={url} alt={name} loading="lazy" onError={() => setBroken(true)}
            ref={(img) => { if (img?.complete && !img.naturalWidth && img.currentSrc) setBroken(true); }} />
        : <span aria-hidden="true">{initials(name)}</span>}
    </div>
  );
}

/** 24 ділиться на 2, 3, 4 і 6 колонок — остання лінійка сторінки без дірок */
const PAGE = 24;

/** Які номери сторінок показати: перша, остання і сусіди поточної; null — «…» (як у CatalogPager) */
function pageList(current: number, last: number): (number | null)[] {
  const want = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
  const out: (number | null)[] = [];
  let prev = 0;
  for (const n of [...want].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function DevelopersExplorer({ devs }: { devs: DevCard[] }) {
  const t = useT();
  const lp = useLp();
  const [q, setQRaw] = useState('');
  const [city, setCityRaw] = useState('');
  const [has, setHasRaw] = useState(''); // '' | 'yes' | 'no'
  // показані сторінки списку «Усі забудовники»: «Показати ще» додає наступну, номер — переходить на неї
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const listTop = useRef<HTMLElement>(null);
  // новий фільтр — знову з першої сторінки
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setFrom(1); setTo(1); };
  const setQ = reset(setQRaw), setCity = reset(setCityRaw), setHas = reset(setHasRaw);

  // фільтр зсуває блоки вгору; без перерахунку ScrollTrigger (див. Motion) вони лишились би прихованими до прокрутки
  useEffect(() => { ScrollTrigger.refresh(); }, [q, city, has, from, to]);

  const cities = useMemo(() => [...new Set(devs.flatMap((d) => d.projects.map((p) => p.city)).filter(Boolean))].sort(), [devs]);
  const shown = devs.filter((d) => {
    if (q && !fold(`${d.name} ${d.projects.map((p) => p.name).join(' ')}`).includes(fold(q.trim()))) return false;
    if (city && !d.projects.some((p) => p.city === city)) return false;
    if (has === 'yes' && !d.projects.length) return false;
    if (has === 'no' && d.projects.length) return false;
    return true;
  });
  // хто вже будує на Hogarli — окремою секцією з фото ЖК; більше проєктів — вище
  const building = shown.filter((d) => d.projects.length)
    .sort((a, b) => b.projects.length - a.projects.length || Number(b.verified) - Number(a.verified));
  const filtered = Boolean(q || city || has);
  const count = (n: number) => t(n === 1 ? '1 development' : '{n} developments', { n });
  const clear = () => { setQ(''); setCity(''); setHas(''); };
  const pages = Math.ceil(shown.length / PAGE);
  const page = shown.slice((from - 1) * PAGE, to * PAGE);
  const go = (n: number) => {
    setFrom(n); setTo(n);
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="fsel-row devs-filters">
        <label className="devs-filters__q">{t('Search')}
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t('Company or development name')} />
        </label>
        {cities.length > 1 && (
          <label>{t('City')}
            <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t('All cities')}</option>
              {cities.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </label>
        )}
        <label>{t('Projects on Hogarli')}
          <select className="input" value={has} onChange={(e) => setHas(e.target.value)}>
            <option value="">{t('Any')}</option>
            <option value="yes">{t('With projects')}</option>
            <option value="no">{t('No projects yet')}</option>
          </select>
        </label>
      </div>

      {!shown.length && (
        <p className="muted" style={{ marginTop: 20 }}>
          {t('No developers match these filters.')}{' '}
          <button type="button" className="link-accent" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            onClick={clear}>{t('Clear filters')}</button>
        </p>
      )}

      {building.length > 0 && (
        <section className="section">
          <div className="section__head"><h2>{t('Building now')}</h2></div>
          <div className="devs-grid devs-grid--feat">
            {building.map((d) => {
              const cities = [...new Set(d.projects.map((p) => p.city).filter(Boolean))];
              return (
                <Link key={d.id} href={lp(`/developers/${d.slug}`)} className="devc devc--feat">
                  <div className="devc__cover">
                    <Photo src={d.cover} alt={d.projects[0].name} label="" />
                    <DevLogo src={d.logo} name={d.name} className="devc__badge" />
                  </div>
                  <div className="devc__body">
                    <b className="devc__name">
                      <span className="devc__clip">{d.name}</span>
                      {d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                    </b>
                    <div className="small">
                      <span className="devc__count">{count(d.projects.length)}</span>
                      {d.founded && <span className="muted"> · {t('since {year}', { year: d.founded })}</span>}
                    </div>
                    <div className="devc__projects small muted">
                      {d.projects.slice(0, 3).map((p) => p.name).join(' · ')}
                      {d.projects.length > 3 && ` +${d.projects.length - 3}`}
                    </div>
                    <div className="devc__tags">
                      {cities.map((c) => <span key={c} className="devc__tag"><Icon name="pin" size={12} />{t(c)}</span>)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {shown.length > 0 && !(has === 'yes') && (
        <section ref={listTop} className="section devs-list" style={building.length ? { paddingTop: 0 } : undefined}>
          <div className="section__head"><h2>{filtered ? t('Developers found: {n}', { n: shown.length }) : t('All developers')}</h2></div>
          <div className="devs-grid">
            {page.map((d) => (
              <Link key={d.id} href={lp(`/developers/${d.slug}`)} className="devc">
                <DevLogo src={d.logo} name={d.name} />
                <div className="devc__body">
                  <b className="devc__name">
                    <span className="devc__clip">{d.name}</span>
                    {d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                  </b>
                  <div className="small muted">
                    {d.projects.length ? count(d.projects.length) : t('No projects yet')}
                    {d.founded && ` · ${t('since {year}', { year: d.founded })}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {pages > 1 && (
            <div className="cpager">
              {to < pages && (
                <button type="button" className="btn btn--ghost btn--lg" onClick={() => setTo(to + 1)}>
                  {t('Show more — {n} left', { n: shown.length - to * PAGE })}
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
      )}
    </>
  );
}
