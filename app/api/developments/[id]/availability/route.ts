import { NextResponse } from 'next/server';
import { getDevelopment } from '@/lib/db';
import { visitAvailability } from '@/lib/visitBookings';

type Ctx = { params: Promise<{ id: string }> };

/** Свята, місткість і зайняті слоти ЖК — календар запису ховає повні слоти й неробочі дні. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const dev = await getDevelopment(id);
  if (!dev || !dev.active) return NextResponse.json({ error: 'Development not found' }, { status: 404 });
  return NextResponse.json(await visitAvailability(dev), { headers: { 'Cache-Control': 'no-store' } });
}
