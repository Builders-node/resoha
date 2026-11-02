import { NextResponse } from 'next/server';
import { listMapPlaces } from '@/lib/db';

/** Спільний шар місць для карти (0070). Публічно, кешуємо на CDN — місця міняються рідко. */
export async function GET() {
  const places = await listMapPlaces();
  return NextResponse.json({ places }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
}
