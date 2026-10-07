import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Avatar from '@/components/Avatar';
import DevelopmentSalesOffice from '@/components/DevelopmentSalesOffice';
import DevelopmentShell from '@/components/DevelopmentShell';
import Icon from '@/components/Icon';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';

const MapView = dynamic(() => import('@/components/MapView'));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'contacts', label: 'Contacts', about: 'Sales office address, opening hours, booking a visit, the agent and the developer.',
  });
}

/** Контакти відділу продажів, як у LUN: адреса, години, хто продає, забудовник, сайт, карта. */
export default async function ContactsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  const { dev, agent, from, base } = ctx;
  // адреса й графік відділу продажів — у блоці зверху, тут решта контактів
  const rows = [
    dev.developer && ['building', 'Developer', dev.developer],
  ].filter(Boolean) as [string, string, string][];

  return (
    <DevelopmentShell ctx={ctx} active="contacts" title="Contacts">
      <DevelopmentSalesOffice ctx={ctx} />
      <ul className="contacts" style={{ marginTop: 22 }}>
        {rows.map(([icon, label, value]) => (
          <li key={label}>
            <Icon name={icon} size={22} />
            <div><span className="small muted">{label}</span>
              {label === 'Developer' && dev.developerId
                ? <Link href={`/developers/${dev.developerId}`}><b>{value}</b></Link>
                : <b style={{ whiteSpace: 'pre-line' }}>{value}</b>}</div>
          </li>
        ))}
        {dev.website && (
          <li>
            <Icon name="link" size={22} />
            <div><span className="small muted">Project website</span>
              <a href={dev.website} target="_blank" rel="noopener noreferrer nofollow"><b>
                {dev.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</b></a></div>
          </li>
        )}
        <li>
          <Avatar src={agent.avatar} name={agent.name} />
          <div><span className="small muted">Sales agent</span>
            <Link href={`/agents/${agent.id}`}><b>{agent.name}</b></Link>
            {agent.agency && <span className="small muted">{agent.agency}</span>}</div>
        </li>
      </ul>
      <p className="small muted" style={{ marginTop: 12 }}>
        {dev.schedule.length > 0
          ? <>Pick a time with <Link href={`${base}/visit`}>Book a visit</Link>, or call and message the agent on the right.</>
          : <>Call or message the agent on the right, or use <a href="#contact">Request a viewing</a> to book a visit to the sales office or the site.</>}
      </p>

      <h3 style={{ marginTop: 26, marginBottom: 12 }}>On the map</h3>
      <div id="miniMap">
        <MapView items={[{ id: dev.id, lat: dev.lat, lng: dev.lng, price: from ?? 0, deal: 'sale' }]}
          center={[dev.lat, dev.lng]} detail />
      </div>
    </DevelopmentShell>
  );
}
