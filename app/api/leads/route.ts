import { NextResponse } from 'next/server';
import { createLead, listLeads } from '@/lib/db';
import { currentUser } from '@/lib/session';

/**
 * Один список для двох ролей: RLS віддає ріелтору його заявки (власнику — по всій агенції),
 * а покупцеві — ті, що він надіслав сам.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  return NextResponse.json({ items: await listLeads() });
}

export async function POST(req: Request) {
  const { listingId, name, phone, email, message } = await req.json().catch(() => ({}));
  if (!listingId) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (!name || !phone) return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });

  const user = await currentUser();
  const ok = await createLead({
    listingId, name, phone, email: email ?? user?.email ?? '', message: message ?? '',
    userId: user?.id ?? null,   // залогінений бачитиме заявку в своєму кабінеті
  });
  if (!ok) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
