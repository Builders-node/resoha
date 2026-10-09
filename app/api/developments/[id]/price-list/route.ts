import { NextResponse } from 'next/server';
import { applyPriceListRpc, createListing, getBuilding, getDevelopment, getDevelopmentUnits, updateListing } from '@/lib/db';
import { kickNotifications } from '@/lib/notify';
import { PRICE_LIST_MAX, cleanPriceRow, diffPriceList, generatedTitle, type PriceListRow } from '@/lib/priceList';
import { currentUser } from '@/lib/session';
import { canManageDevelopment } from '@/lib/units';

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/**
 * Прайс забудовника з оновленням: apply=false — лише порівняння з квартирами ЖК
 * (нові / змінені / без змін / помилки), apply=true — запис одним запитом.
 * Рядки з помилками пропускаємо; порівняння щоразу рахуємо заново з бази.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const dev = await getDevelopment(id);
  if (!dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, PRICE_LIST_MAX).map(cleanPriceRow)
    .filter((r: PriceListRow | null): r is PriceListRow => r !== null);
  if (!rows.length) return NextResponse.json({ error: 'No units found — each row needs a unit number and a price' }, { status: 400 });
  const deal = body.deal === 'rent' ? 'rent' : 'sale';
  const buildingId = body.buildingId ? String(body.buildingId) : null;
  const building = buildingId ? await getBuilding(buildingId) : null;
  if (buildingId && building?.developmentId !== dev.id) return NextResponse.json({ error: 'Building is not in this development' }, { status: 400 });

  const diff = diffPriceList(rows, await getDevelopmentUnits(dev.id), { buildingId, devName: dev.name });
  if (!body.apply) return NextResponse.json({ diff });
  if (!diff.added.length && !diff.changed.length) return NextResponse.json({ created: 0, updated: 0, skipped: diff.errors.length });

  const changed = diff.changed.map((c) => ({ id: c.id, unit: c.unit, ...c.after, ...(c.title ? { title: c.title } : {}) }));
  try {
    let done = await applyPriceListRpc({ developmentId: dev.id, buildingId, deal, added: diff.added, changed });
    // до міграції 0054 функції немає — по одній квартирі, без спільної транзакції
    if (!done) {
      done = { created: 0, updated: 0 };
      for (const r of diff.added) {
        await createListing({
          agentId: user.isAdmin ? dev.agentId : user.id, agencyId: dev.agencyId,
          deal, type: 'condo', title: generatedTitle(dev.name, r.unit, r.beds),
          island: dev.island, neighborhood: dev.neighborhood, address: building?.address || dev.address,
          price: r.price, beds: r.beds, baths: 0, sqft: r.sqft,
          lat: dev.lat, lng: dev.lng, photos: dev.photos, text: dev.text,
          titled: false, developmentId: dev.id, buildingId, unitNo: r.unit, floor: r.floor, status: r.status ?? 'available',
        });
        done.created++;
      }
      for (const c of changed) {
        const { id: unitId, unit: _unit, ...patch } = c;
        void _unit;
        if (!(await updateListing(unitId, patch))) throw new Error(`Unit ${c.unit} could not be updated`);
        done.updated++;
      }
    }
    if (diff.changed.some((c) => c.fields.includes('price'))) kickNotifications();
    return NextResponse.json({ ...done, skipped: diff.errors.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
