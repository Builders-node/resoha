import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { listDevelopers, listDevelopments } from '@/lib/db';
import { SITE_NAME } from '@/lib/site';
import { getLp, getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/developers', {
    title: `${t('Developers in Roatán')} | ${SITE_NAME}`,
    description: t('Property developers building on Roatán and their projects.'),
  });
}

export default async function DevelopersPage() {
  const lp = await getLp();
  const [devs, projects] = await Promise.all([listDevelopers(), listDevelopments()]);
  const count = (id: string) => projects.filter((p) => p.developerId === id).length;

  return (
    <div className="wrap" style={{ padding: '32px 32px 60px' }}>
      <h1 style={{ fontSize: 'var(--fs-h1)', marginBottom: 6 }}>Developers</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Companies building on Roatán. <Link className="link-accent" href="/developer">Add your company</Link>
      </p>
      {!devs.length && <p className="muted">No developers listed yet.</p>}
      <div className="dev-list">
        {devs.map((d) => (
          <Link key={d.id} href={lp(`/developers/${d.slug}`)} className="dev-list__row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Photo className="thumb" src={d.logo} label="" />
              <div>
                <b className="with-ico">{d.name}{d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}</b>
                <div className="small muted">
                  {count(d.id) === 1 ? '1 development' : `${count(d.id)} developments`}
                  {d.founded && ` · since ${d.founded}`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
