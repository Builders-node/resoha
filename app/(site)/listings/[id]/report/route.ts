import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAgent, getListing } from '@/lib/db';
import { fmtDate, fmtPrice, photoUrl } from '@/lib/format';
import { LAND_FIELDS, isChecked, landLabel, readiness } from '@/lib/land';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Ctx = { params: Promise<{ id: string }> };

const INK = rgb(0.075, 0.075, 0.086);
const MUTED = rgb(0.42, 0.42, 0.47);
const LINE = rgb(0.9, 0.9, 0.92);
const ORANGE = rgb(1, 0.28, 0);
const TONE = { ok: rgb(0.09, 0.4, 0.2), warn: rgb(0.57, 0.25, 0.05), bad: rgb(0.6, 0.1, 0.1), muted: MUTED };

/** Стандартні шрифти PDF знають лише Latin-1: усе поза ним міняємо на близький символ. */
const ascii = (s: string) => s.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, '-').replace(/[^\x00-\xff]/g, '?');

/**
 * Паспорт ділянки одним аркушем — щоб ріелтор міг кинути його покупцю у WhatsApp.
 * Той самий lib/land.ts, що й на сторінці: PDF ніколи не каже інше, ніж сайт.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.type !== 'land') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const agent = await getAgent(listing.agentId);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${listing.title} - land report`);
  pdf.setAuthor(SITE_NAME);
  const page = pdf.addPage([595, 842]);   // A4
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const W = 595, M = 48;
  let y = 842 - M;

  const text = (s: string, x: number, size: number, font = reg, color = INK) =>
    page.drawText(ascii(s), { x, y, size, font, color });
  const wrap = (s: string, size: number, maxWidth: number, font = reg) => {
    const out: string[] = []; let line = '';
    for (const word of ascii(s).split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
    return out;
  };

  // шапка
  page.drawRectangle({ x: 0, y: 842 - 64, width: W, height: 64, color: INK });
  page.drawText('RESOHA ROATAN', { x: M, y: 842 - 40, size: 14, font: bold, color: rgb(1, 1, 1) });
  page.drawText('LAND REPORT', { x: W - M - bold.widthOfTextAtSize('LAND REPORT', 11), y: 842 - 40, size: 11, font: bold, color: ORANGE });
  y = 842 - 64 - 36;

  // заголовок, ціна, район
  for (const l of wrap(listing.title, 20, W - 2 * M, bold)) { text(l, M, 20, bold); y -= 26; }
  text(`${fmtPrice(listing.price, listing.deal)}   ·   ${listing.lotAcres} acres   ·   ${listing.neighborhood}, Roatan`, M, 12, reg, MUTED);
  y -= 22;

  // фото, якщо є справжнє
  const photo = photoUrl(listing.photos[0]);
  if (photo) {
    try {
      const res = await fetch(photo);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const ct = res.headers.get('content-type') ?? '';
      const img = ct.includes('png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const h = 200, w = Math.min(W - 2 * M, img.width * (h / img.height));
      y -= h;
      page.drawImage(img, { x: M, y, width: w, height: h });
      y -= 18;
    } catch { /* фото не обовʼязкове — звіт без нього все одно корисний */ }
  }

  // оцінка
  const land = listing.land;
  const r = readiness(land);
  text('Land check', M, 15, bold);
  const badge = ascii(isChecked(land) ? `${r.label}  ${r.score}/${r.of}` : r.label);
  const bw = bold.widthOfTextAtSize(badge, 11) + 20;
  page.drawRectangle({ x: W - M - bw, y: y - 6, width: bw, height: 24, color: rgb(0.96, 0.96, 0.97), borderColor: LINE, borderWidth: 1 });
  page.drawText(badge, { x: W - M - bw + 10, y: y + 1, size: 11, font: bold, color: TONE[r.tone] });
  y -= 17;
  text(isChecked(land)
    ? `Checked ${fmtDate(land.checkedAt!)}${land.checkedBy ? ` by ${land.checkedBy}` : ''}`
    : 'Nobody has confirmed these details yet.', M, 10, reg, MUTED);
  y -= 22;

  for (const f of LAND_FIELDS) {
    const value = isChecked(land) ? land[f.key] : 'unknown';
    const state = value === 'unknown' ? 'muted' : f.good ? (f.good.includes(value) ? 'ok' : 'bad') : 'info';
    page.drawLine({ start: { x: M, y: y + 16 }, end: { x: W - M, y: y + 16 }, thickness: 0.5, color: LINE });
    text(f.label, M, 11, reg, MUTED);
    const v = landLabel(f, value);
    page.drawText(ascii(v), {
      x: W - M - bold.widthOfTextAtSize(ascii(v), 11), y, size: 11, font: bold,
      color: state === 'ok' ? TONE.ok : state === 'bad' ? TONE.bad : state === 'muted' ? MUTED : INK,
    });
    y -= 24;
  }
  y -= 10;

  // опис (коротко)
  if (listing.text) {
    text('About this lot', M, 13, bold); y -= 18;
    for (const l of wrap(listing.text, 10.5, W - 2 * M).slice(0, 8)) { text(l, M, 10.5); y -= 14; }
    y -= 10;
  }

  // контакт і джерело
  if (agent) {
    text('Contact', M, 13, bold); y -= 18;
    const contact = [agent.name, agent.agency, agent.whatsapp && `WhatsApp ${agent.whatsapp}`, agent.phone && !agent.whatsapp && agent.phone]
      .filter(Boolean).join('  ·  ');
    text(contact, M, 10.5); y -= 16;
  }
  if (listing.sourceName) {
    text(`Facts from ${listing.sourceName}${listing.sourceRef ? ` · ${listing.sourceRef}` : ''}`, M, 10, reg, MUTED); y -= 14;
  }
  text(`${SITE_URL}/listings/${listing.id}`, M, 10, reg, ORANGE); y -= 14;

  // підвал
  const foot = `Generated ${fmtDate(new Date().toISOString())} by ${SITE_NAME}. "Ready to build" means title, road, electricity and water are in place. `
    + 'Verify the title at the Instituto de la Propiedad before paying a deposit.';
  let fy = M - 6;
  for (const l of wrap(foot, 8.5, W - 2 * M).reverse()) { page.drawText(l, { x: M, y: fy, size: 8.5, font: reg, color: MUTED }); fy += 11; }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="resoha-land-${listing.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  });
}
