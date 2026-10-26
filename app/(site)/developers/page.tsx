import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { listDevelopers, listDevelopments } from '@/lib/db';
import { photoUrl } from '@/lib/format';
import { SITE_NAME } from '@/lib/site';
import { getLp, getT } from '@/lib/i18n/server';
import type { Development } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/developers', {
    title: `${t('Developers in Honduras')} | ${SITE_NAME}`,
    description: t('Property developers and builders in Roatán, San Pedro Sula and Tegucigalpa, and their projects.'),
  });
}

const initials = (name: string) =>
  name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter((w) => /^[\p{L}\d]/u.test(w)).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase() || '·';

/** Логотипи бувають будь-яких пропорцій, тож вписуємо їх у світлу плитку; без логотипу — ініціали замість сірої камери. */
function DevLogo({ src, name, className = '' }: { src: string; name: string; className?: string }) {
  const url = photoUrl(src);
  return (
    <div className={`devc__logo${url ? '' : ' devc__logo--ini'} ${className}`.trim()}>
      {url ? <img src={url} alt={name} loading="lazy" /> : <span aria-hidden="true">{initials(name)}</span>}
    </div>
  );
}

export default async function DevelopersPage() {
  const lp = await getLp();
  const [devs, projects, t] = await Promise.all([listDevelopers(), listDevelopments(), getT()]);

  const byDev = new Map<string, Development[]>();
  projects.forEach((p) => p.developerId && byDev.set(p.developerId, [...(byDev.get(p.developerId) ?? []), p]));
  const own = (id: string) => byDev.get(id) ?? [];
  // хто вже будує на Hogarli — окремою секцією з фото ЖК; більше проєктів — вище
  const building = devs.filter((d) => own(d.id).length)
    .sort((a, b) => own(b.id).length - own(a.id).length || Number(b.verified) - Number(a.verified));
  const count = (n: number) => t(n === 1 ? '1 development' : '{n} developments', { n });

  return (
    <div className="wrap">
      <header className="page-top devs-head">
        <div>
          <h1 style={{ fontSize: 'var(--fs-h1)' }}>{t('Developers')}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t('Companies building in Honduras.')}
            {devs.length > 0 && <> {t('{n} companies, {m} with projects on Hogarli.', { n: devs.length, m: building.length })}</>}
          </p>
        </div>
        <Link className="btn btn--primary" href="/developer">{t('Add your company')} <Icon name="arrowRight" size={18} /></Link>
      </header>

      {!devs.length && (
        <section className="section"><div className="panel empty"><b>{t('No developers listed yet.')}</b></div></section>
      )}

      {building.length > 0 && (
        <section className="section">
          <div className="section__head"><h2>{t('Building now')}</h2></div>
          <div className="devs-grid devs-grid--feat">
            {building.map((d) => {
              const list = own(d.id);
              const cities = [...new Set(list.map((p) => p.island).filter(Boolean))];
              return (
                <Link key={d.id} href={lp(`/developers/${d.slug}`)} className="devc devc--feat">
                  <div className="devc__cover">
                    <Photo src={list.find((p) => p.photos[0])?.photos[0]} alt={list[0].name} label="" />
                    <DevLogo src={d.logo} name={d.name} className="devc__badge" />
                  </div>
                  <div className="devc__body">
                    <b className="devc__name">
                      {d.name}
                      {d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                    </b>
                    <div className="small">
                      <span className="devc__count">{count(list.length)}</span>
                      {d.founded && <span className="muted"> · {t('since {year}', { year: d.founded })}</span>}
                    </div>
                    <div className="devc__projects small muted">
                      {list.slice(0, 3).map((p) => p.name).join(' · ')}
                      {list.length > 3 && ` +${list.length - 3}`}
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

      {devs.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head"><h2>{t('All developers')}</h2></div>
          <div className="devs-grid">
            {devs.map((d) => (
              <Link key={d.id} href={lp(`/developers/${d.slug}`)} className="devc">
                <DevLogo src={d.logo} name={d.name} />
                <div className="devc__body">
                  <b className="devc__name">
                    {d.name}
                    {d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                  </b>
                  <div className="small muted">
                    {own(d.id).length ? count(own(d.id).length) : t('No projects yet')}
                    {d.founded && ` · ${t('since {year}', { year: d.founded })}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="crumbs crumbs--foot small muted"><Link href={lp('/')}>{t('Home')}</Link> · {t('Developers')}</div>
    </div>
  );
}
