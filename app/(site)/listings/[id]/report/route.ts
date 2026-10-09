import { NextResponse } from 'next/server';
import { getAgent, getListing, queryListings } from '@/lib/db';
import { landReport, listingBooklet } from '@/lib/booklets';
import { getLang } from '@/lib/i18n/server';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PDF обʼєкта — щоб ріелтор міг кинути його покупцю у WhatsApp.
 * Земля — паспорт ділянки одним аркушем, решта — буклет з фото, характеристиками й контактом.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const agent = await getAgent(listing.agentId);
  // як і сторінка: автора заблоковано — обʼєкта для покупців немає
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (listing.type === 'land') {
    return landReport(listing, agent, await queryListings({ deal: 'sale', type: 'land' }));
  }
  return listingBooklet(listing, agent, await getLang());
}
