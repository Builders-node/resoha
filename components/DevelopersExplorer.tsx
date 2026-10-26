'use client';
import { useEffect, useMemo, useState } from 'react';
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

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function DevelopersExplorer({ devs }: { devs: DevCard[] }) {
  const t = useT();
  const lp = useLp();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [has, setHas] = useState(''); // '' | 'yes' | 'no'

  // фільтр зсуває блоки вгору; без перерахунку ScrollTrigger (див. Motion) вони лишились би прихованими до прокрутки
  useEffect(() => { ScrollTrigger.refresh(); }, [q, city, has]);

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
        <section className="section" style={building.length ? { paddingTop: 0 } : undefined}>
          <div className="section__head"><h2>{filtered ? t('Developers found: {n}', { n: shown.length }) : t('All developers')}</h2></div>
          <div className="devs-grid">
            {shown.map((d) => (
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
        </section>
      )}
    </>
  );
}
