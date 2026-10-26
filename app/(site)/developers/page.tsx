import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Icon from '@/components/Icon';
import DevelopersExplorer, { type DevCard } from '@/components/DevelopersExplorer';
import { listDevelopers, listDevelopments } from '@/lib/db';
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

export default async function DevelopersPage() {
  const lp = await getLp();
  const [devs, projects, t] = await Promise.all([listDevelopers(), listDevelopments(), getT()]);

  const byDev = new Map<string, Development[]>();
  projects.forEach((p) => p.developerId && byDev.set(p.developerId, [...(byDev.get(p.developerId) ?? []), p]));
  const cards: DevCard[] = devs.map((d) => {
    const list = byDev.get(d.id) ?? [];
    return {
      id: d.id, slug: d.slug, name: d.name, logo: d.logo, verified: d.verified, founded: d.founded,
      projects: list.map((p) => ({ name: p.name, city: p.island })),
      cover: list.find((p) => p.photos[0])?.photos[0] ?? '',
    };
  });
  const building = cards.filter((d) => d.projects.length).length;

  return (
    <div className="wrap">
      <header className="page-top devs-head">
        <div>
          <h1 style={{ fontSize: 'var(--fs-h1)' }}>{t('Developers')}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t('Companies building in Honduras.')}
            {devs.length > 0 && <> {t('{n} companies, {m} with projects on Hogarli.', { n: devs.length, m: building })}</>}
          </p>
        </div>
        <Link className="btn btn--primary" href="/developer">{t('Add your company')} <Icon name="arrowRight" size={18} /></Link>
      </header>

      {!devs.length
        ? <section className="section"><div className="panel empty"><b>{t('No developers listed yet.')}</b></div></section>
        : <DevelopersExplorer devs={cards} />}

      <div className="crumbs crumbs--foot small muted"><Link href={lp('/')}>{t('Home')}</Link> · {t('Developers')}</div>
    </div>
  );
}
