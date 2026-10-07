import { NextResponse } from 'next/server';
import { adminLog } from '@/lib/db';
import { currentUser } from '@/lib/session';
import {
  PROMO_KINDS, activateCampaign, cancelCampaign, getCampaign, listCampaigns, listPackages, savePackage,
  sweepPromotions, type PromoKind,
} from '@/lib/promo';
import { stripeEnabled, stripeTestMode } from '@/lib/stripe';

/** Вкладка Promotions в адмінці: усі кампанії, виручка, ціни пакетів. */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  try {
    await sweepPromotions();
    const [campaigns, packages] = await Promise.all([listCampaigns({ all: true }), listPackages(true)]);
    return NextResponse.json({
      campaigns, packages,
      payments: stripeEnabled() ? (stripeTestMode() ? 'stripe-test' : 'stripe') : 'manual',
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, unavailable: true }, { status: 503 });
  }
}

type Action =
  | { action: 'activate' | 'cancel'; id: string; ref?: string }
  | { action: 'package'; id?: string; kind: PromoKind; days: number; priceCents: number; active: boolean };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => ({})) as Action;
  const actor = { id: user.id, name: user.name };

  try {
    if (body.action === 'activate' || body.action === 'cancel') {
      const c = await getCampaign(body.id);
      if (!c) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      if (body.action === 'activate') await activateCampaign(body.id, 'manual', (body.ref ?? '').slice(0, 200));
      else await cancelCampaign(body.id);
      await adminLog(actor, {
        action: `campaign.${body.action}`, targetKind: 'campaign', targetId: body.id,
        targetName: `${c.targetName} · ${c.days}d`,
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'package') {
      const days = Math.round(Number(body.days));
      const priceCents = Math.round(Number(body.priceCents));
      if (!PROMO_KINDS.includes(body.kind) || !(days >= 1 && days <= 365) || !(priceCents >= 0)) {
        return NextResponse.json({ error: 'Check the duration (1–365 days) and price' }, { status: 400 });
      }
      await savePackage({ id: body.id, kind: body.kind, days, priceCents, active: body.active !== false });
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
