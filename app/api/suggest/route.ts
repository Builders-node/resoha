import { NextResponse } from 'next/server';
import { isSearchTab, suggest } from '@/lib/suggest';

/** Підказки для пошуку на головній: GET /api/suggest?q=west&deal=sale|rent|land|new */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const deal = sp.get('deal');
  const items = await suggest(sp.get('q') ?? '', isSearchTab(deal) ? deal : 'sale').catch(() => []);
  return NextResponse.json({ items });
}
