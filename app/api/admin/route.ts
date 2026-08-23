import { NextResponse } from 'next/server';
import {
  adminListAgencies, adminListReviews, adminListUsers, adminOverview,
  adminSetAgencyFlags, adminSetListingFlags, adminSetProfileFlags, adminDeleteReview,
  queryListings,
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
    default:
      return NextResponse.json({ overview: await adminOverview() });
  }
}

type Action =
  | { kind: 'profile'; id: string; verified?: boolean; active?: boolean; isAdmin?: boolean }
  | { kind: 'agency'; id: string; verified?: boolean }
  | { kind: 'listing'; id: string; featured?: boolean; active?: boolean }
  | { kind: 'review'; id: string; remove: true };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Action;
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  switch (body.kind) {
    case 'profile': {
      if (body.id === user.id && body.isAdmin === false) {
        return NextResponse.json({ error: 'You cannot remove your own admin rights' }, { status: 400 });
      }
      if (body.id === user.id && body.active === false) {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
      }
      return NextResponse.json({ item: await adminSetProfileFlags(body.id, body) });
    }
    case 'agency':
      return NextResponse.json({ item: await adminSetAgencyFlags(body.id, body) });
    case 'listing':
      return NextResponse.json({ item: await adminSetListingFlags(body.id, body) });
    case 'review':
      return NextResponse.json({ ok: await adminDeleteReview(body.id) });
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
