import SalesOffice from './SalesOffice';
import { getDeveloper } from '@/lib/db';
import type { DevContext } from '@/lib/developmentPage';

/** Блок відділу продажів для сторінок ЖК: адреса й графік — із ЖК, телефон — агента, логотип — забудовника */
export default async function DevelopmentSalesOffice({ ctx }: { ctx: DevContext }) {
  const { dev, agent, base, leadUnit } = ctx;
  const developer = dev.developerId ? await getDeveloper(dev.developerId) : null;
  return (
    <SalesOffice name={dev.name}
      address={dev.office || [dev.address, dev.neighborhood].filter(Boolean).join(', ')}
      schedule={dev.schedule} note={dev.hours}
      phone={agent.phone} whatsapp={agent.whatsapp}
      visitHref={dev.schedule.length && leadUnit ? `${base}/visit` : null}
      logo={developer?.logo || undefined} listingId={leadUnit?.id} />
  );
}
