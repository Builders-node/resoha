import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Avatar from '@/components/Avatar';
import DevelopmentSalesOffice from '@/components/DevelopmentSalesOffice';
import DevelopmentShell from '@/components/DevelopmentShell';
import DevelopmentUpdates from '@/components/DevelopmentUpdates';
import Icon from '@/components/Icon';
import { VisitPicker } from '@/components/VisitBooking';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';
import { getT } from '@/lib/i18n/server';
import { SALES_OFFERS } from '@/lib/visits';

const MapView = dynamic(() => import('@/components/MapView'));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'contacts', label: 'Contacts', about: 'Sales office address, opening hours, booking a visit, the agent and the developer.',
  });
}

/**
 * Контакти ЖК, як у LUN: карта на всю ширину з карткою відділу продажів поверх неї,
 * «У відділі продажу вам запропонують» поруч із календарем запису на візит, нижче — хто продає
 * і банер підписки на оновлення ЖК.
 */
export default async function ContactsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  const { dev, agent, me, from, base, leadUnit } = ctx;
  const t = await getT();
  const canBook = dev.schedule.length > 0 && !!leadUnit;

  return (
    <DevelopmentShell ctx={ctx} active="contacts" wide>
      <section className="dcon__map">
        <div className="dcon__canvas">
          <MapView items={[{ id: dev.id, lat: dev.lat, lng: dev.lng, price: from ?? 0, deal: 'sale' }]}
            center={[dev.lat, dev.lng]} detail />
        </div>
        <div className="dcon__card"><DevelopmentSalesOffice ctx={ctx} card /></div>
      </section>

      <div className={`dcon__row${canBook ? '' : ' dcon__row--solo'}`}>
        <section>
          <h2 className="dcon__h">{t('At the sales office you can get:')}</h2>
          <ul className="dcon__offers">
            {SALES_OFFERS.map(([icon, label]) => <li key={label}><Icon name={icon} size={24} /> {t(label)}</li>)}
          </ul>

          <ul className="contacts dcon__more">
            {dev.developer && (
              <li>
                <Icon name="building" size={22} />
                <div><span className="small muted">{t('Developer')}</span>
                  {dev.developerId
                    ? <Link href={`/developers/${dev.developerId}`}><b>{dev.developer}</b></Link>
                    : <b>{dev.developer}</b>}</div>
              </li>
            )}
            {dev.website && (
              <li>
                <Icon name="link" size={22} />
                <div><span className="small muted">{t('Project website')}</span>
                  <a href={dev.website} target="_blank" rel="noopener noreferrer nofollow"><b>
                    {dev.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</b></a></div>
              </li>
            )}
            <li>
              <Avatar src={agent.avatar} name={agent.name} />
              <div><span className="small muted">{t('Sales agent')}</span>
                <Link href={`/agents/${agent.id}`}><b>{agent.name}</b></Link>
                {agent.agency && <span className="small muted">{agent.agency}</span>}</div>
            </li>
          </ul>
        </section>

        {canBook && (
          <aside className="dcon__book">
            <h2 className="dcon__h">{t('Book a visit to the sales office')}</h2>
            <VisitPicker schedule={dev.schedule} href={`${base}/visit`} />
          </aside>
        )}
      </div>

      <DevelopmentUpdates devId={dev.id} devName={dev.name} email={me?.email ?? ''} />
    </DevelopmentShell>
  );
}
