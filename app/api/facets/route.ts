import { NextResponse } from 'next/server';
import { facets } from '@/lib/db';
import type { Deal, PropertyType } from '@/lib/types';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  return NextResponse.json(await facets({
    deal: (sp.get('deal') as Deal) || undefined,
    type: (sp.get('type') as PropertyType) || undefined,
  }));
}
