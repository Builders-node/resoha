import { NextResponse } from 'next/server';
import { createListing, getImportedListings, updateListing } from '@/lib/db';
import { IMPORT_CHUNK, cleanImportRow, newListingInput, planImport, type ImportRow } from '@/lib/listingImport';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import type { Listing } from '@/lib/types';

export const maxDuration = 60;

const NO_MIGRATION = 'Import is not set up yet: run database migration 0054 first.';

/** Уже імпортовані оголошення ріелтора — браузер порівнює з ними файл і показує попередній перегляд */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const existing = await getImportedListings(user.id);
  if (!existing) return NextResponse.json({ error: NO_MIGRATION }, { status: 501 });
  return NextResponse.json({ existing });
}

type Result = { line: number; externalId: string; ok: boolean; action: 'new' | 'update' | 'same' | 'error'; id?: string; review?: string; error?: string };

/**
 * apply — частина рядків (до IMPORT_CHUNK) через звичайні createListing / updateListing:
 * RLS, модерація (тригер listings_review) і пошук дублів працюють як при ручному збереженні.
 * План рахуємо заново з бази, тож повторний запуск нічого не задублює.
 * unpublish — зняти з показу імпортовані оголошення, яких більше немає у фіді.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'unpublish') {
    const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String));
    const mine = await getImportedListings(user.id);
    if (!mine) return NextResponse.json({ error: NO_MIGRATION }, { status: 501 });
    let done = 0;
    for (const l of mine.filter((m) => ids.has(m.id) && m.active).slice(0, 500)) {
      if (await updateListing(l.id, { active: false })) done++;
    }
    return NextResponse.json({ unpublished: done });
  }

  const raw: unknown[] = (Array.isArray(body.rows) ? body.rows : []).slice(0, IMPORT_CHUNK);
  if (!raw.length) return NextResponse.json({ error: 'No rows received' }, { status: 400 });
  const refs = raw.map((r) => cleanImportRow(r).externalId).filter(Boolean);
  const existing = await getImportedListings(user.id, refs);
  if (!existing) return NextResponse.json({ error: NO_MIGRATION }, { status: 501 });

  const results: Result[] = [];
  let kick = false;
  for (const plan of planImport(raw, existing)) {
    const base = { line: plan.row.line, externalId: plan.row.externalId ?? '' };
    try {
      if (plan.kind === 'error') results.push({ ...base, ok: false, action: 'error', error: plan.message });
      else if (plan.kind === 'same') results.push({ ...base, ok: true, action: 'same', id: plan.id });
      else if (plan.kind === 'new') {
        const l = await createListing({ ...newListingInput(plan.row), agentId: user.id, agencyId: user.agencyId });
        if (l.review === 'pending') kick = true;
        results.push({ ...base, ok: true, action: 'new', id: l.id, review: l.review });
      } else {
        const patch: Partial<Record<keyof ImportRow, unknown>> = {};
        for (const f of plan.fields) patch[f] = plan.row[f];
        const l = await updateListing(plan.id, patch as Partial<Listing>);
        if (!l) throw new Error('Not allowed');
        if (plan.fields.includes('price')) kick = true;
        results.push({ ...base, ok: true, action: 'update', id: l.id, review: l.review });
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      results.push({
        ...base, ok: false, action: 'error',
        error: err.code === '23505' ? 'This reference was imported a moment ago — run the import again' : err.message ?? 'Could not save',
      });
    }
  }
  if (kick) kickNotifications();
  return NextResponse.json({ results });
}
