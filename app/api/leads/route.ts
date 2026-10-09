import { NextResponse } from 'next/server';
import { createLead, listLeads } from '@/lib/db';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
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

/**
 * Два канали: форма на сторінці обʼєкта та перехід у WhatsApp. Другий — основний
 * для цього ринку; розмова йде в месенджері, а тут лишається відмітка, щоб ріелтор
 * і платформа бачили, за якими обʼєктами звертаються.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.listingId) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Ботові відповідаємо так само, як людині: відмова лише підказала б, що підправити
  if (looksAutomated(body)) return NextResponse.json({ ok: true }, { status: 201 });

  if (!(await withinLimit(req, 'lead', 8, 3600))) {
    return NextResponse.json(
      { error: 'Too many enquiries from this connection. Please try again in an hour.' }, { status: 429 },
    );
  }

  const user = await currentUser();
  const channel = body.channel === 'whatsapp' ? 'whatsapp' : 'form';

  const name = channel === 'whatsapp' ? (user?.name || 'WhatsApp visitor') : clip(body.name, 120);
  const phone = channel === 'whatsapp' ? (user?.phone ?? '') : clip(body.phone, 40);
  if (channel === 'form' && (!name || !phone)) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
  }

  try {
    const ok = await createLead({
      listingId: String(body.listingId),
      name,
      phone: clip(phone, 40),
      email: clip(body.email, 200) || user?.email || '',
      message: channel === 'whatsapp' ? 'Opened WhatsApp from the listing page.' : clip(body.message, 2000),
      userId: user?.id ?? null,   // залогінений бачитиме звернення у своєму кабінеті
      channel,
    });
    if (!ok) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    // ріелтор дізнається про заявку одразу, а не з наступним проходом черги
    if (channel === 'form') kickNotifications();
  } catch (e) {
    // межі з тригера leads_guard приходять готовим текстом
    const message = (e as { message?: string }).message ?? '';
    if (/too many/i.test(message)) return NextResponse.json({ error: message }, { status: 429 });
    return NextResponse.json({ error: 'Could not send the enquiry' }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
