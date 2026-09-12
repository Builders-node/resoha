import { NextResponse } from 'next/server';
import {
  adminDeleteListing, adminListAgencies, adminListLog, adminListReviews, adminListUsers,
  adminLog, adminOverview, adminSetAgencyFlags, adminSetListingFlags, adminSetProfileFlags,
  adminDeleteReview, listLeads, queryListings,
} from '@/lib/db';
import { currentUser } from '@/lib/session';

/** Дані для адмінки. Права ще раз перевіряє RLS — тут просто відсікаємо зайві запити. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const section = new URL(req.url).searchParams.get('section') ?? 'overview';
  switch (section) {
    case 'listings':
      return NextResponse.json({ items: await queryListings({ includeInactive: true, sort: 'new' }) });
    case 'agencies':
      return NextResponse.json({ items: await adminListAgencies() });
    case 'users':
      return NextResponse.json({ items: await adminListUsers() });
    case 'reviews':
      return NextResponse.json({ items: await adminListReviews() });
    // Заявки адмін бачить усі (так дозволяє leads_read), але не редагує:
    // воронка належить ріелтору, адмін лише спостерігає, чи на них відповідають.
    case 'leads':
      return NextResponse.json({ items: await listLeads() });
    case 'log':
      return NextResponse.json({ items: await adminListLog() });
    default:
      return NextResponse.json({ overview: await adminOverview() });
  }
}

type Action =
  | { kind: 'profile'; id: string; verified?: boolean; active?: boolean; isAdmin?: boolean }
  | { kind: 'agency'; id: string; verified?: boolean }
  | { kind: 'listing'; id: string; featured?: boolean; active?: boolean }
  | { kind: 'listing'; id: string; remove: true }
  | { kind: 'review'; id: string; remove: true };

/** Людською мовою для журналу: «listing.hide», а не голий JSON патча. */
function describe(body: Action): string {
  if (body.kind === 'review') return 'review.delete';
  if (body.kind === 'listing') {
    if ('remove' in body) return 'listing.delete';
    if (body.featured !== undefined) return body.featured ? 'listing.feature' : 'listing.unfeature';
    if (body.active !== undefined) return body.active ? 'listing.restore' : 'listing.hide';
  }
  if (body.kind === 'agency') return body.verified ? 'agency.verify' : 'agency.unverify';
  if (body.kind === 'profile') {
    if (body.isAdmin !== undefined) return body.isAdmin ? 'profile.grant_admin' : 'profile.revoke_admin';
    if (body.active !== undefined) return body.active ? 'profile.restore' : 'profile.suspend';
    if (body.verified !== undefined) return body.verified ? 'profile.verify' : 'profile.unverify';
  }
  return `${body.kind}.update`;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Action & { reason?: string; targetName?: string };
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const record = (kind: Action['kind']) => adminLog(
    { id: user.id, name: user.name },
    { action: describe(body), targetKind: kind, targetId: body.id, targetName: body.targetName, reason: body.reason },
  );

  switch (body.kind) {
    case 'profile': {
      if (body.id === user.id && body.isAdmin === false) {
        return NextResponse.json({ error: 'You cannot remove your own admin rights' }, { status: 400 });
      }
      if (body.id === user.id && body.active === false) {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
      }
      const item = await adminSetProfileFlags(body.id, body);
      await record('profile');
      return NextResponse.json({ item });
    }
    case 'agency': {
      const item = await adminSetAgencyFlags(body.id, body);
      await record('agency');
      return NextResponse.json({ item });
    }
    case 'listing': {
      if ('remove' in body) {
        const ok = await adminDeleteListing(body.id);
        if (!ok) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        await record('listing');
        return NextResponse.json({ ok });
      }
      const item = await adminSetListingFlags(body.id, body);
      await record('listing');
      return NextResponse.json({ item });
    }
    case 'review': {
      const ok = await adminDeleteReview(body.id);
      await record('review');
      return NextResponse.json({ ok });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
