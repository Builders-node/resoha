import { NextResponse } from 'next/server';
import { createListing, getDevelopment } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { canManageDevelopment, parsePriceList, unitTypeLabel } from '@/lib/units';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Прайс забудовника одним махом: кожен рядок стає окремим оголошенням у ЖК
 * з адресою, пінами й фото самого ЖК.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const dev = await getDevelopment(id);
  if (!dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const rows = parsePriceList(String(body.text ?? '')).slice(0, 300);
  if (!rows.length) return NextResponse.json({ error: 'No units found — one row per unit: unit, type, floor, m², ft², price' }, { status: 400 });
  const deal = body.deal === 'rent' ? 'rent' : 'sale';

  const created: string[] = [];
  try {
    for (const r of rows) {
      const l = await createListing({
        // RLS пускає вставку лише від свого імені; адмін записує на автора ЖК
        agentId: user.isAdmin ? dev.agentId : user.id, agencyId: dev.agencyId,
        deal, type: 'condo',
        title: `${dev.name} · Unit ${r.unit} · ${unitTypeLabel(r.beds)}`,
        island: dev.island, neighborhood: dev.neighborhood, address: dev.address,
        // санвузлів у прайсі немає — лишаємо порожнім, а не вигадуємо
        price: r.price, beds: r.beds, baths: 0, sqft: r.sqft,
        lat: dev.lat, lng: dev.lng, photos: dev.photos, text: dev.text,
        titled: false, developmentId: dev.id, unitNo: r.unit, floor: r.floor, status: 'available',
      });
      created.push(l.id);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, created: created.length }, { status: 400 });
  }
  return NextResponse.json({ created: created.length }, { status: 201 });
}
