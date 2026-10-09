import { NextResponse } from 'next/server';
import { createLead, getDevelopment, queryListings } from '@/lib/db';
import { pickLeadUnit } from '@/lib/developmentPage';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { CONTACT_PREFS, contactPrefShort, fmtVisit, isOpenSlot, officeDayOf } from '@/lib/visits';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Запис на візит у відділ продажів ЖК. Це звичайна заявка в Leads (на першу вільну квартиру,
 * як і форма на сторінці ЖК), але з датою й часом візиту, темами і зручним способом звʼязку.
 * Слот перевіряємо за графіком ЖК тут, бо клієнт може надіслати що завгодно.
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

  const at = new Date(String(body.visitAt ?? ''));
  if (!dev.schedule.length || Number.isNaN(at.getTime()) || !isOpenSlot(dev.schedule, at)) {
    return NextResponse.json({ error: 'This time is no longer available. Please pick another one.' }, { status: 400 });
  }
  // свята; місткість слота перевіряє база (тригер leads_visit_slot, 0055) — під блокуванням
  if (dev.blackoutDates.includes(officeDayOf(at))) {
    return NextResponse.json({ error: 'The sales office is closed on this day. Please pick another time.' }, { status: 400 });
  }

  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 200);
  if (!name || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Name, email and phone are required' }, { status: 400 });
  }
  // темами можуть бути і спальні з квартир ЖК («2 BR»), тож список не жорсткий — лише короткі рядки
  const interests = (Array.isArray(body.interests) ? body.interests : [])
    .filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x: string) => x.trim().slice(0, 60)).slice(0, 30);
  const contactVia = CONTACT_PREFS.some(([k]) => k === body.contactVia) ? String(body.contactVia) : 'phone';
  const comment = clip(body.message, 1200);

  // текст — на випадок, коли колонок візиту в базі ще немає (див. createLead)
  const visitSummary = [
    `Office visit: ${fmtVisit(at.toISOString())} (Roatán time).`,
    interests.length > 0 && `Interested in: ${interests.join(', ')}.`,
    `Prefers ${contactPrefShort(contactVia)}.`,
  ].filter(Boolean).join('\n');

  const user = await currentUser();
  try {
    await createLead({
      listingId: unit.id, name, phone, email, message: comment, visitSummary, userId: user?.id ?? null,
      channel: 'visit', visitAt: at.toISOString(), interests, contactVia,
    });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? '';
    if (/too many/i.test(msg)) return NextResponse.json({ error: msg }, { status: 429 });
    if (/no longer available|closed on this day/i.test(msg)) {
      return NextResponse.json({ error: 'This time is no longer available. Please pick another one.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not book the visit' }, { status: 400 });
  }
  kickNotifications();
  return NextResponse.json({ ok: true }, { status: 201 });
}

