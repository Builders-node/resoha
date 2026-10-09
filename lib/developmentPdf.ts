import { NextResponse } from 'next/server';
import { getAgent, getDevelopment, listBuildings, queryListings } from './db';
import { developmentBooklet, developmentPriceList } from './booklets';

/** Дані для PDF ЖК: ті самі, що бачить сторінка ЖК (RLS вирішує, чи видно прихований ЖК). */
export async function developmentPdf(slug: string, kind: 'booklet' | 'prices') {
  const dev = await getDevelopment(slug);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [agent, units, buildings] = await Promise.all([
    getAgent(dev.agentId),
    queryListings({ developmentId: dev.id, sort: 'price_asc' }),
    listBuildings(dev.id),
  ]);
  // автора заблоковано — ЖК не показуємо, як і на сторінці
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data = { dev, agent, units, buildings };
  return kind === 'booklet' ? developmentBooklet(data) : developmentPriceList(data);
}
