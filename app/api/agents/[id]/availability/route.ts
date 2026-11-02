import { NextResponse } from 'next/server';
import { agentAvailability, agentViewingHours } from '@/lib/visitBookings';

type Ctx = { params: Promise<{ id: string }> };

/** Години показів ріелтора й зайняті слоти — для запису на перегляд вторинки (0069). Без імен покупців. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const [hours, avail] = await Promise.all([agentViewingHours(id), agentAvailability(id)]);
  return NextResponse.json({ ...avail, schedule: hours.schedule, enabled: hours.enabled },
    { headers: { 'Cache-Control': 'no-store' } });
}
