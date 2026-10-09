import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { listDevelopers, listDevelopments } from '@/lib/db';
import { SITE_NAME } from '@/lib/site';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: `Developers in Roatán | ${SITE_NAME}`,
  description: 'Property developers building on Roatán and their projects.',
  alternates: { canonical: '/developers' },
};

export default async function DevelopersPage() {
  const [devs, projects, t] = await Promise.all([listDevelopers(), listDevelopments(), getT()]);
  const count = (id: string) => projects.filter((p) => p.developerId === id).length;

  return (
    <div className="wrap" style={{ padding: '32px 32px 60px' }}>
      <h1 style={{ fontSize: 'var(--fs-h1)', marginBottom: 6 }}>{t('Developers')}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        {t('Companies building on Roatán.')} <Link className="link-accent" href="/developer">{t('Add your company')}</Link>
      </p>
      {!devs.length && <p className="muted">{t('No developers listed yet.')}</p>}
      <div className="dev-list">
        {devs.map((d) => (
          <Link key={d.id} href={`/developers/${d.slug}`} className="dev-list__row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Photo className="thumb" src={d.logo} label="" />
              <div>
                <b className="with-ico">{d.name}{d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}</b>
                <div className="small muted">
                  {t(count(d.id) === 1 ? '1 development' : '{n} developments', { n: count(d.id) })}
                  {d.founded && ` · ${t('since {year}', { year: d.founded })}`}

                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
