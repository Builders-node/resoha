import { NextResponse } from 'next/server';
import { createLead, getListing } from '@/lib/db';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { agentViewingHours } from '@/lib/visitBookings';
import { CONTACT_PREFS, contactPrefShort, fmtVisit, isOpenSlot } from '@/lib/visits';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Запис на перегляд вторинки на вільний слот (0069). Та сама заявка-візит, що й у ЖК (channel 'visit'):
 * лист із .ics, посилання «змінити чи скасувати», нагадування за добу й за годину.
 * Слот перевіряємо за годинами показів ріелтора; зайнятість ріелтора — тригер у базі.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (looksAutomated(body)) return NextResponse.json({ ok: true }, { status: 201 });

  if (!(await withinLimit(req, 'lead', 8, 3600))) {
    return NextResponse.json({ error: 'Too many enquiries from this connection. Please try again in an hour.' }, { status: 429 });
  }

  const listing = await getListing(id);
  // квартири ЖК записуються у відділ продажів, не сюди
  if (!listing || !listing.active || listing.developmentId) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  const hours = await agentViewingHours(listing.agentId);
  if (!hours.enabled) return NextResponse.json({ error: 'This agent does not take online bookings. Please send a message instead.' }, { status: 400 });

  const at = new Date(String(body.visitAt ?? ''));
  if (Number.isNaN(at.getTime()) || !isOpenSlot(hours.schedule, at)) {
    return NextResponse.json({ error: 'This time is no longer available. Please pick another one.' }, { status: 400 });
  }

  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 200);
  if (!name || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Name, email and phone are required' }, { status: 400 });
  }
  const interests = (Array.isArray(body.interests) ? body.interests : [])
    .filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x: string) => x.trim().slice(0, 60)).slice(0, 10);
  const contactVia = CONTACT_PREFS.some(([k]) => k === body.contactVia) ? String(body.contactVia) : 'whatsapp';
  const message = clip(body.message, 1200);

  const visitSummary = [
    `Viewing: ${fmtVisit(at.toISOString())} (Honduras time).`,
    interests.length > 0 && `Interested in: ${interests.join(', ')}.`,
    `Prefers ${contactPrefShort(contactVia)}.`,
  ].filter(Boolean).join('\n');

  const user = await currentUser();
  try {
    await createLead({
      listingId: listing.id, name, phone, email, message, visitSummary, userId: user?.id ?? null,
      channel: 'visit', visitAt: at.toISOString(), interests, contactVia,
    });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? '';
    if (/too many/i.test(msg)) return NextResponse.json({ error: msg }, { status: 429 });
    if (/no longer available|closed on this day|visit time/i.test(msg)) {
      return NextResponse.json({ error: 'This time is no longer available. Please pick another one.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not book the viewing' }, { status: 400 });
  }
  kickNotifications();
  return NextResponse.json({ ok: true }, { status: 201 });
}
