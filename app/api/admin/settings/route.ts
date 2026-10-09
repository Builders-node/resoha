import { NextResponse } from 'next/server';
import { adminLog, getSiteSettings, updateSiteSettings } from '@/lib/db';
import type { SiteSettings } from '@/lib/types';
import { currentUser } from '@/lib/session';

const LABELS: Record<keyof SiteSettings, string> = {
  showPurchaseCosts: 'purchase costs block',
  showFinancing: 'financing block',
};

/** Налаштування сайту: читає й міняє лише адмін (і ще раз — RLS). */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  return NextResponse.json({ settings: await getSiteSettings() });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Partial<SiteSettings>;
  try {
    const settings = await updateSiteSettings(body);
    for (const k of Object.keys(LABELS) as (keyof SiteSettings)[]) {
      if (typeof body[k] !== 'boolean') continue;
      await adminLog({ id: user.id, name: user.name }, {
        action: body[k] ? 'settings.on' : 'settings.off', targetKind: 'site', targetId: null, targetName: LABELS[k],
      });
    }
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
