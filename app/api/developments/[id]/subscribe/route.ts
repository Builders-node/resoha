import { NextResponse } from 'next/server';
import { createLead, getDevelopment, queryListings } from '@/lib/db';
import { pickLeadUnit } from '@/lib/developmentPage';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { currentUser } from '@/lib/session';
import { UPDATE_TOPICS } from '@/lib/visits';

type Ctx = { params: Promise<{ id: string }> };

/**
 * «Підписатись на оновлення ЖК» з вкладки «Contacts». Розсилки на сайті немає, тож це заявка
 * в Leads ріелтора (як і запис на візит): людина з email, що чекає новин про акції, ціни й будівництво.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (looksAutomated(body)) return NextResponse.json({ ok: true }, { status: 201 });

  if (!(await withinLimit(req, 'lead', 8, 3600))) {
    return NextResponse.json(
      { error: 'Too many enquiries from this connection. Please try again in an hour.' }, { status: 429 },
    );
  }

  const dev = await getDevelopment(id);
  if (!dev || !dev.active) return NextResponse.json({ error: 'Development not found' }, { status: 404 });
  const unit = pickLeadUnit(await queryListings({ developmentId: dev.id }));
  if (!unit) return NextResponse.json({ error: 'Development not found' }, { status: 404 });

  const email = clip(body.email, 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });

  const user = await currentUser();
  try {
    await createLead({
      listingId: unit.id, name: clip(user?.name, 120) || email.split('@')[0], phone: clip(user?.phone, 40), email,
      message: `Subscribed to ${dev.name} updates: ${UPDATE_TOPICS.join(', ').toLowerCase()}.`,
      userId: user?.id ?? null,
    });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? '';
    if (/too many/i.test(msg)) return NextResponse.json({ error: msg }, { status: 429 });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
