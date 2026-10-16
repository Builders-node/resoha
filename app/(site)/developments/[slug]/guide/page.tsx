import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DevelopmentShell from '@/components/DevelopmentShell';
import Icon from '@/components/Icon';
import { RESIDENT_GUIDES } from '@/lib/content/residentGuides';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';
import { getLp, getT } from '@/lib/i18n/server';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'guide', label: 'Resident guide', about: 'Amenities and hours in the building, front desk, community channels, health and what is nearby.',
  });
}

/** Гід для мешканців: зручності з поверхом і годинами, спільнота, здоровʼя, що поруч. */
export default async function GuidePage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  const guide = RESIDENT_GUIDES[ctx.dev.slug];
  if (!guide) notFound();
  const [t, lp] = await Promise.all([getT(), getLp()]);

  return (
    <DevelopmentShell ctx={ctx} active="guide" title="Resident guide">
      <p className="dguide__lead">{t(guide.lead)}</p>

      <section className="dev" style={{ marginTop: 24 }}>
        <h2 className="dev__title">{t('In the building')}</h2>
        <ul className="dguide__grid">
          {guide.amenities.map((a) => (
            <li key={a.name} className="dguide__card">
              <Icon name={a.icon} size={26} />
              <b>{t(a.name)}</b>
              {a.level && <span className="small muted">{t(a.level)}</span>}
              <span className="dguide__hours"><Icon name="clock" size={15} /> {t(a.hours)}</span>
              {a.note && <span className="small">{t(a.note)}</span>}
            </li>
          ))}
        </ul>
        <p className="tiny muted" style={{ marginTop: 10 }}>{t('Hours are set by the building operator and can change; check with the front desk.')}</p>
      </section>

      <section className="dev">
        <h2 className="dev__title">{t('Community and news')}</h2>
        <ul className="contacts">
          {guide.community.map((c) => (
            <li key={c.href}>
              <Icon name={c.icon} size={22} />
              <div><span className="small muted">{t(c.label)}</span>
                <a href={c.href} target="_blank" rel="noopener noreferrer nofollow"><b>{c.value}</b></a></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="dev">
        <h2 className="dev__title">{t('Health and emergencies')}</h2>
        <ul className="dguide__list">{guide.health.map((h) => <li key={h}>{t(h)}</li>)}</ul>
      </section>

      <section className="dev">
        <div className="dev__head">
          <h2 className="dev__title">{t('Around the tower')}</h2>
          <Link className="dev__more" href={lp(guide.around.article)}>{t('Local guide')} →</Link>
        </div>
        <div className="dguide__table">
          <table>
            <thead><tr><th>{t('Place')}</th><th>{t('Best for')}</th><th>{t('Roughly by car')}</th></tr></thead>
            <tbody>
              {guide.around.drives.map(([place, best, time]) => (
                <tr key={place}><td><b>{t(place)}</b></td><td>{t(best)}</td><td>{t(time)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link className="dteaser" href={lp(guide.around.article)} style={{ marginTop: 16 }}>
          <Icon name="pin" size={28} />
          <span><b>{t('West Bay and beyond: the best places near Duna Tower, Roatán')}</b>
            <span className="small muted">{t('Beaches, snorkeling, restaurants and day trips within half an hour of the building.')}</span></span>
          <Icon name="arrowRight" size={20} />
        </Link>
      </section>

      <p className="tiny muted" style={{ marginTop: 28 }}>
        {t('Based on the')}{' '}
        <a href={guide.source.href} target="_blank" rel="noopener noreferrer nofollow">{t(guide.source.label)}</a>.
      </p>
    </DevelopmentShell>
  );
}
