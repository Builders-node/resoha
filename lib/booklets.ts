import { Booklet, MUTED, ORANGE, SOFT, LINE, TONE, INK } from './pdf';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPerArea, fmtPrice, fmtUsd, sqftToM2 } from './format';
import { LAND_FIELDS, isChecked, landLabel, landNumbers, landState, readiness } from './land';
import { DETAIL_FIELDS, IN_UNIT, detailLabel, floorLine } from './details';
import { OPEN_STATUSES, fromPrice, salesLabel, statusLabel, toM2 } from './units';
import { developmentFeatures } from '@/components/DevelopmentFeatures';
import { makeT, type Lang } from './i18n';
import { SITE_NAME, SITE_URL } from './site';
import type { Agent, Building, Development, Listing } from './types';

/**
 * PDF-буклети: паспорт ділянки, буклет будь-якого обʼєкта, буклет і прайс ЖК.
 * Дані — ті самі функції, що й на сторінках (lib/land, lib/details, developmentFeatures),
 * тож PDF ніколи не каже інше, ніж сайт.
 */

const contactLine = (agent: Agent | null) => agent
  ? [agent.name, agent.agency, agent.whatsapp && `WhatsApp ${agent.whatsapp}`, agent.phone && agent.phone !== agent.whatsapp && agent.phone]
    .filter(Boolean).join('  ·  ')
  : '';

/* ---------- паспорт ділянки (як раніше, але через спільний верстальник) ---------- */
export async function landReport(listing: Listing, agent: Agent | null, peers: Listing[]) {
  const b = await Booklet.create(`${listing.title} - land report`, 'Land report');
  const n = landNumbers(listing, peers);
  const { M, W } = b;

  for (const l of b.wrap(listing.title, 20, b.inner, b.bold)) { b.text(l, M, 20, b.bold); b.y -= 26; }
  b.text(`${fmtPrice(listing.price, listing.deal)}   ·   ${listing.lotAcres} acres   ·   ${listing.neighborhood}, Roatan`, M, 12, b.reg, MUTED);
  b.y -= 22;
  await b.hero(listing.photos[0], 120);

  // оцінка
  const land = listing.land;
  const r = readiness(land);
  b.need(60);
  b.text('Land passport', M, 15, b.bold);
  const badge = isChecked(land) ? `${r.label}  ${r.score}/${r.of}` : r.label;
  const bw = b.width(badge, 11, b.bold) + 20;
  b.page.drawRectangle({ x: W - M - bw, y: b.y - 6, width: bw, height: 24, color: SOFT, borderColor: LINE, borderWidth: 1 });
  b.text(badge, W - M - bw + 10, 11, b.bold, TONE[r.tone]);
  b.y -= 17;
  b.text(isChecked(land)
    ? `Checked ${fmtDate(land.checkedAt!)}${land.checkedBy ? ` by ${land.checkedBy}` : ''}`
    : 'Nobody has confirmed these details yet.', M, 10, b.reg, MUTED);
  b.y -= 22;

  for (const f of LAND_FIELDS) {
    const value = isChecked(land) ? land[f.key] : 'unknown';
    const state = landState(f, value);
    b.row(f.label, landLabel(f, value), {
      size: 11, color: state === 'ok' ? TONE.ok : state === 'bad' ? TONE.bad : state === 'na' ? MUTED : INK,
    });
  }
  b.y -= 10;

  // цифри — та сама landNumbers, що й на сторінці
  b.heading('The lot in numbers', 13);
  if (n.acres) b.row('Size', `${fmtNumber(n.sqm)} m2  ·  ${n.acres} ac  ·  ${fmtNumber(n.sqft)} ft2`, { size: 10 });
  if (n.perAcre) b.row('Price per acre', `${fmtUsd(Math.round(n.perAcre))}${n.benchmark && n.vsBenchmark !== null
    ? `  (${n.vsBenchmark === 0 ? 'at' : `${Math.abs(n.vsBenchmark)}% ${n.vsBenchmark > 0 ? 'above' : 'below'}`} ${n.benchmark.where} median ${fmtUsd(Math.round(n.benchmark.perAcre))})`
    : ''}`, { size: 10 });
  if (n.closing) b.row('Cost to buy (4-5.5%)', `${fmtUsd(Math.round(n.closing.low))} - ${fmtUsd(Math.round(n.closing.high))}`, { size: 10 });
  if (n.taxMax) b.row('Property tax', `up to ${fmtUsd(Math.round(n.taxMax))} a year`, { size: 10 });
  if (n.foreign) b.row('Foreign buyers', n.foreign === 'personal' ? 'Under 3,000 m2: can own in own name' : 'Over 3,000 m2: usually via a Honduran company', { size: 10 });
  b.row('Distances (straight line)', n.distances.map((d) => `${d.name.replace(' (RTB)', '')} ${d.km.toFixed(1)} km`).join('  ·  '), { size: 10 });
  b.y -= 10;

  if (listing.text) {
    b.heading('About this lot', 13);
    b.paragraph(listing.text, 10.5, { maxLines: 3 });
  }
  if (agent) {
    b.heading('Contact', 13);
    b.paragraph(contactLine(agent), 10.5, { gap: 4 });
  }
  if (listing.sourceName) b.paragraph(`Facts from ${listing.sourceName}${listing.sourceRef ? ` · ${listing.sourceRef}` : ''}`, 10, { color: MUTED, gap: 2 });
  b.paragraph(`${SITE_URL}/listings/${listing.id}`, 10, { color: ORANGE });

  return b.response(`resoha-land-${listing.id.slice(0, 8)}.pdf`,
    `Generated ${fmtDate(new Date().toISOString())} by ${SITE_NAME}. "Ready to build" means title, road, electricity and water are in place. `
    + 'Costs and limits are estimates, not legal advice. Verify the title at the Instituto de la Propiedad before paying a deposit.');
}

/* ---------- буклет будь-якого обʼєкта ---------- */
export async function listingBooklet(listing: Listing, agent: Agent | null, lang: Lang) {
  const t = makeT(lang);
  const b = await Booklet.create(`${listing.title} - ${t('Property booklet')}`, t('Property booklet'));
  const { M } = b;

  for (const l of b.wrap(listing.title, 20, b.inner, b.bold)) { b.text(l, M, 20, b.bold); b.y -= 26; }
  const place = [listing.address, listing.neighborhood, listing.island].filter(Boolean).join(', ');
  b.text(place, M, 11, b.reg, MUTED);
  b.y -= 26;
  const price = listing.price > 0 ? fmtPrice(listing.price, listing.deal, lang) : t('Price on request');
  b.text(price, M, 20, b.bold, ORANGE);
  const after = [
    listing.status !== 'available' ? t(statusLabel(listing.status)) : '',
    listing.deal === 'sale' && listing.sqft > 0 && listing.price > 0 ? fmtPerArea(listing.price, listing.sqft) : '',
    listing.hoa > 0 ? `${t('HOA')} ${fmtUsd(listing.hoa)}${t('/mo')}` : '',
  ].filter(Boolean).join('  ·  ');
  if (after) b.text(after, M + b.width(price, 20, b.bold) + 12, 10.5, b.reg, MUTED);
  b.y -= 22;

  await b.hero(listing.photos[0], 270);

  const m2 = listing.sqft > 0 ? sqftToM2(listing.sqft) : 0;
  b.tiles(listing.type === 'land' ? [
    [t('Lot size'), t('{n} ac', { n: listing.lotAcres })],
    [t('Type'), t(TYPE_LABELS[listing.type])],
    [t('Deal'), t(DEAL_LABELS[listing.deal])],
  ] : [
    [t('Bedrooms'), listing.beds > 0 ? String(listing.beds) : t('Studio')],
    [t('Bathrooms'), listing.baths ? String(listing.baths) : '-'],
    [t('Interior'), m2 ? `${fmtNumber(m2)} m2` : '-', listing.sqft > 0 ? `${fmtNumber(listing.sqft)} ft2` : undefined],
    listing.developmentId
      ? [t('Unit · floor'), `${listing.unitNo || '-'}${listing.floor !== null ? ` · ${listing.floor}` : ''}`]
      : [t('Built'), listing.year ? String(listing.year) : '-'],
  ]);

  // «Details» — ті самі поля й підписи, що на сторінці
  const rows: [string, string][] = [
    [t('Type'), `${t(TYPE_LABELS[listing.type])} · ${t(DEAL_LABELS[listing.deal])}`],
    ...(listing.development ? [[t('Development'), listing.development.name] as [string, string]] : []),
    ...(listing.floor !== null || listing.details.floorsTotal
      ? [[t('Floor'), floorLine(listing.floor, listing.details.floorsTotal, lang)] as [string, string]] : []),
    ...(listing.lotAcres > 0 && listing.type !== 'land' ? [[t('Lot size'), t('{n} ac', { n: listing.lotAcres })] as [string, string]] : []),
    ...DETAIL_FIELDS.filter((f) => !f.rentOnly || listing.deal === 'rent')
      .map((f): [string, string] => [t(f.label), t(detailLabel(f, listing.details[f.key]))]),
    ...(listing.oceanfront ? [[t('Frontage'), t('Oceanfront')] as [string, string]] : []),
    ...(listing.ownerFinancing ? [[t('Financing'), t('Owner financing available')] as [string, string]] : []),
  ].filter(([, v]) => v) as [string, string][];
  if (rows.length) {
    b.heading(t('Details'));
    for (const [k, v] of rows) b.row(k, v);
    b.y -= 8;
  }

  const inUnit = IN_UNIT.filter(([k]) => listing.details.inUnit?.includes(k)).map(([, label]) => t(label));
  if (inUnit.length) {
    b.heading(t('In the apartment'));
    b.paragraph(inUnit.join('  ·  '));
  }
  if (listing.tags.length) b.paragraph(listing.tags.map((tag) => t(tag)).join('  ·  '), 10, { color: MUTED });

  if (listing.text) {
    b.heading(t('About this property'));
    b.paragraph(listing.text);
  }

  const more = listing.photos.slice(1, 9);
  if (more.length) {
    b.need(220);
    b.heading(t('Photos'));
    await b.photoGrid(more);
  }

  b.heading(t('Contact'));
  if (agent) b.paragraph(contactLine(agent), 10.5, { gap: 4 });
  if (listing.sourceName) b.paragraph(`${t('Facts on this page come from')} ${listing.sourceName}${listing.sourceRef ? ` · ${listing.sourceRef}` : ''}`, 10, { color: MUTED, gap: 2 });
  b.paragraph(`${SITE_URL}/listings/${listing.id}`, 10, { color: ORANGE, gap: 2 });
  b.paragraph(t('Listing ID {id}', { id: listing.id }), 8.5, { color: MUTED });

  return b.response(`resoha-${listing.id.slice(0, 8)}.pdf`,
    t('Generated {date} by {site}. Details come from the listing agent and can change: confirm them before you sign or pay a deposit.',
      { date: fmtDate(new Date().toISOString(), lang), site: SITE_NAME }));
}

/* ---------- ЖК: прайс ---------- */
type DevData = { dev: Development; agent: Agent | null; units: Listing[]; buildings: Building[] };

const bedsLabel = (beds: number) => (beds > 0 ? `${beds} BR` : 'Studio');

function priceTable(b: Booklet, { units, buildings }: DevData) {
  const bName = new Map(buildings.map((x) => [x.id, x.name]));
  const order = new Map(buildings.map((x, i) => [x.id, i]));
  const multi = buildings.length > 1;
  const sorted = [...units].sort((a, c) =>
    (order.get(a.buildingId ?? '') ?? 999) - (order.get(c.buildingId ?? '') ?? 999)
    || (a.floor ?? 0) - (c.floor ?? 0)
    || a.unitNo.localeCompare(c.unitNo, 'en', { numeric: true }));
  const cols = [
    ...(multi ? [{ label: 'Building', width: 80 }] : []),
    { label: 'Unit', width: 44 },
    { label: 'Floor', width: 34, align: 'right' as const },
    { label: 'Type', width: 46 },
    { label: 'Baths', width: 34, align: 'right' as const },
    { label: 'm2', width: 40, align: 'right' as const },
    { label: 'ft2', width: 44, align: 'right' as const },
    { label: 'Price', width: 80, align: 'right' as const },
    { label: '$/m2', width: 52, align: 'right' as const },
    { label: 'Status', width: 58 },
  ];
  b.table(cols, sorted.map((u) => {
    const open = OPEN_STATUSES.includes(u.status);
    return {
      muted: !open,
      cells: [
        ...(multi ? [bName.get(u.buildingId ?? '') ?? ''] : []),
        u.unitNo || '-',
        u.floor !== null ? String(u.floor) : '-',
        bedsLabel(u.beds),
        u.baths ? String(u.baths) : '-',
        u.sqft ? String(Math.round(toM2(u.sqft))) : '-',
        u.sqft ? fmtNumber(u.sqft) : '-',
        open && u.price > 0 ? fmtPrice(u.price, u.deal) : '-',
        open && u.price > 0 && u.sqft > 0 && u.deal === 'sale' ? fmtUsd(Math.round(u.price / toM2(u.sqft))) : '-',
        statusLabel(u.status),
      ],
    };
  }), 8.5);
}

function devSummary({ units }: DevData) {
  const open = units.filter((u) => u.status === 'available').length;
  const from = fromPrice(units.filter((u) => u.deal === 'sale'));
  return [`${units.length} ${units.length === 1 ? 'unit' : 'units'}`, `${open} available`, from ? `from ${fmtUsd(from)}` : '']
    .filter(Boolean).join('  ·  ');
}

const DEV_NOTE = (dev: Development) => `Generated ${fmtDate(new Date().toISOString())} by ${SITE_NAME} from ${dev.developer || 'the developer'}'s price list. `
  + 'Prices and availability change: confirm the unit with the agent before paying a reservation deposit.';

export async function developmentPriceList(d: DevData) {
  const { dev } = d;
  const b = await Booklet.create(`${dev.name} - price list`, 'Price list');
  b.text(dev.name, b.M, 20, b.bold); b.y -= 22;
  b.text([`${dev.neighborhood}, ${dev.island}`, dev.developer, dev.completion && `Completion ${dev.completion}`].filter(Boolean).join('  ·  '),
    b.M, 10.5, b.reg, MUTED);
  b.y -= 16;
  b.text(`Prices as of ${fmtDate(new Date().toISOString())}  ·  ${devSummary(d)}`, b.M, 10.5, b.bold); b.y -= 24;
  if (d.units.length) priceTable(b, d);
  else b.paragraph('The developer has not published unit prices yet. Ask the agent for the current price list.', 10.5, { color: MUTED });
  if (dev.payment) {
    b.heading('Payment plan', 12);
    for (const l of dev.payment.split('\n').map((s) => s.trim()).filter(Boolean)) b.paragraph(`-  ${l}`, 10, { gap: 2 });
    b.y -= 8;
  }
  if (d.agent) { b.heading('Contact', 12); b.paragraph(contactLine(d.agent), 10, { gap: 4 }); }
  b.paragraph(`${SITE_URL}/developments/${dev.slug}`, 10, { color: ORANGE });
  return b.response(`${dev.slug}-price-list.pdf`, DEV_NOTE(dev));
}

/* ---------- ЖК: буклет ---------- */
export async function developmentBooklet(d: DevData) {
  const { dev, units, buildings } = d;
  const b = await Booklet.create(`${dev.name} - booklet`, 'New development');
  const { M } = b;
  for (const l of b.wrap(dev.name, 24, b.inner, b.bold)) { b.text(l, M, 24, b.bold); b.y -= 30; }
  b.text([dev.address, `${dev.neighborhood}, ${dev.island}`].filter(Boolean).join(' · '), M, 11, b.reg, MUTED);
  b.y -= 26;
  const from = fromPrice(units.filter((u) => u.deal === 'sale'));
  if (from) { b.text(`From ${fmtUsd(from)}`, M, 20, b.bold, ORANGE); b.y -= 22; }

  await b.hero(dev.photos[0], 280);

  const beds = units.map((u) => u.beds);
  const sizes = units.filter((u) => u.sqft > 0).map((u) => u.sqft);
  b.tiles([
    ['Units', String(units.length || '-'), `${units.filter((u) => u.status === 'available').length} available`],
    ['Types', units.length ? [...new Set([Math.min(...beds), Math.max(...beds)])].map(bedsLabel).join(' - ') : '-'],
    ['Sizes', sizes.length ? `${Math.round(toM2(Math.min(...sizes)))}-${Math.round(toM2(Math.max(...sizes)))} m2` : '-',
      sizes.length ? `${fmtNumber(Math.min(...sizes))}-${fmtNumber(Math.max(...sizes))} ft2` : undefined],
    ['Completion', dev.completion || '-', salesLabel(dev.sales)],
  ]);

  if (dev.text) { b.heading(`About ${dev.name}`); b.paragraph(dev.text); }

  const facts = developmentFeatures(dev, buildings, units);
  if (facts.length) {
    b.heading('Project features');
    for (const [, value, label] of facts) b.row(label.charAt(0).toUpperCase() + label.slice(1), value);
    b.y -= 8;
  }
  if (dev.amenities.length) { b.heading('Amenities'); b.paragraph(dev.amenities.join('  ·  ')); }
  if (dev.payment) {
    b.heading('Payment plan');
    for (const l of dev.payment.split('\n').map((s) => s.trim()).filter(Boolean)) b.paragraph(`-  ${l}`, 10.5, { gap: 2 });
    b.y -= 8;
  }

  const more = [...dev.photos.slice(1), ...buildings.map((x) => x.photo).filter(Boolean)].slice(0, 6);
  if (more.length) { b.need(220); b.heading('Photos'); await b.photoGrid(more); }

  if (units.length) {
    b.addPage();
    b.heading(`Units & prices · ${fmtDate(new Date().toISOString())}`);
    b.paragraph(devSummary(d), 10, { color: MUTED, gap: 6 });
    priceTable(b, d);
  }

  b.heading('Contact');
  if (d.agent) b.paragraph(contactLine(d.agent), 10.5, { gap: 4 });
  if (dev.office) b.paragraph(`Sales office: ${dev.office}${dev.hours ? ` · ${dev.hours}` : ''}`, 10, { gap: 4 });
  if (dev.website) b.paragraph(dev.website, 10, { color: MUTED, gap: 2 });
  b.paragraph(`${SITE_URL}/developments/${dev.slug}`, 10, { color: ORANGE });

  return b.response(`${dev.slug}-booklet.pdf`, DEV_NOTE(dev));
}
