import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { getDeveloper, listDevelopments, queryListings } from '@/lib/db';
import { fmtUsd } from '@/lib/format';
import { SITE_NAME } from '@/lib/site';
import { fromPrice, salesLabel } from '@/lib/units';
import { getLp, getT } from '@/lib/i18n/server';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dev = await getDeveloper((await params).slug);
  if (!dev) return {};
  return localized(`/developers/${dev.slug}`, {
    title: `${dev.name} — ${(await getT())('developer in Roatán')} | ${SITE_NAME}`,
    description: dev.about.slice(0, 160) || `Developments by ${dev.name} on Roatán.`,
  });
}

/** Сторінка забудовника: хто він, контакти і всі його ЖК */
export default async function DeveloperPage({ params }: Props) {
  const lp = await getLp();
  const dev = await getDeveloper((await params).slug);
  if (!dev) notFound();
  const projects = await listDevelopments({ developerId: dev.id });
  const units = await Promise.all(projects.map((p) => queryListings({ developmentId: p.id })));
  const site = dev.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

  return (
    <div className="wrap" style={{ padding: '32px 32px 60px' }}>
      <div className="profile-head">
        <Photo className="dev-logo" src={dev.logo} alt={dev.name} label="" />
        <div>
          <h1 className="with-ico" style={{ fontSize: 24 }}>
            {dev.name}{dev.verified && <Icon name="verified" size={20} className="ico ico--ok" />}
          </h1>
          <div className="muted">
            Developer{dev.founded && ` · since ${dev.founded}`} · {projects.length === 1 ? '1 development' : `${projects.length} developments`}
          </div>
        </div>
      </div>

      {(site || dev.phone || dev.email) && (
        <ul className="contacts" style={{ marginBottom: 24 }}>
          {site && (
            <li><Icon name="link" size={22} /><div><span className="small muted">Website</span>
              <a href={dev.website} target="_blank" rel="noopener noreferrer nofollow"><b>{site}</b></a></div></li>
          )}
          {dev.phone && (
            <li><Icon name="phone" size={22} /><div><span className="small muted">Phone</span>
              <a href={`tel:${dev.phone.replace(/[^+\d]/g, '')}`}><b>{dev.phone}</b></a></div></li>
          )}
          {dev.email && (
            <li><Icon name="inbox" size={22} /><div><span className="small muted">Email</span>
              <a href={`mailto:${dev.email}`}><b>{dev.email}</b></a></div></li>
          )}
        </ul>
      )}

      {dev.about && <p style={{ whiteSpace: 'pre-line', maxWidth: 760, marginBottom: 28 }}>{dev.about}</p>}

      <h2 style={{ fontSize: 'var(--fs-h2)', marginBottom: 16 }}>Developments</h2>
      {!projects.length && <p className="muted">No developments listed yet.</p>}
      <div className="dev-grid">
        {projects.map((p, i) => {
          const from = fromPrice(units[i].filter((u) => u.deal === 'sale'));
          return (
            <Link key={p.id} href={lp(`/developments/${p.slug}`)} className="ov ov--wide">
              <Photo src={p.photos[0]} alt={p.name} />
              <div className="card__badges">{p.featured && <span className="badge badge--featured"><Icon name="star" size={12} /> Featured</span>}<span className="badge badge--brand">{salesLabel(p.sales)}</span></div>
              <div className="ov__b">
                <div className="ov__title">{p.name}</div>
                <div className="ov__meta">{p.neighborhood} · {units[i].length} units{p.completion && ` · ${p.completion}`}</div>
                {from !== null && <div className="ov__price">From {fmtUsd(from)}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
