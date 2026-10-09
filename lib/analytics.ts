import type { Agent, Listing } from './types';

/**
 * Аналітика кабінету: із сирих подій (listing_events) і заявок рахуємо все, що
 * показує вкладка «Analytics». Чиста функція — без бази, щоб її легко було перевірити.
 * Час — роатанський (UTC−6, без переходу на літній): «вівторок о 19:00» має бути їхнім.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const TZ_SHIFT = -6 * 3600000;
const DAY = 86400000;
const local = (iso: string) => new Date(new Date(iso).getTime() + TZ_SHIFT);
const dayKey = (iso: string) => local(iso).toISOString().slice(0, 10);

export const CONTACT_KINDS = ['phone', 'whatsapp', 'viber', 'telegram', 'form_open'] as const;
const isContact = (k: string) => (CONTACT_KINDS as readonly string[]).includes(k);

export type Totals = {
  views: number; visitors: number; contacts: number; leads: number; favorites: number;
  /** заявки / унікальні відвідувачі, % */
  conversion: number;
};

export type DayPoint = { date: string; views: number; visitors: number; contacts: number; leads: number };

export type ListingStat = {
  id: string; title: string; photo: string; price: number; deal: Listing['deal']; type: Listing['type'];
  neighborhood: string; active: boolean; status: Listing['status']; agentId: string;
  development: { name: string; slug: string } | null;
  daysOnMarket: number; allTimeViews: number;
  views: number; visitors: number; contacts: number; leads: number; favorites: number; conversion: number;
  /** перегляди по днях періоду — для спарклайна */
  trend: number[];
  /** $/ft² цього обʼєкта і медіана ринку того ж типу в тому ж районі (лише продаж) */
  ppsf: number; marketPpsf: number; priceDelta: number | null;
  flags: ('overpriced' | 'underpriced' | 'no_leads' | 'no_views' | 'few_photos')[];
};

export type DevStat = {
  id: string; name: string; slug: string; pageViews: number; unitViews: number;
  contacts: number; leads: number; units: number; available: number; sold: number;
};

export type AgentStat = {
  id: string; name: string; avatar: string; listings: number; active: number;
  views: number; contacts: number; leads: number; conversion: number;
  responseHours: number | null; handledShare: number;
};

export type AreaStat = { neighborhood: string; mine: number; market: number; myCount: number; marketCount: number };

export type Insight = { tone: 'good' | 'warn' | 'info'; text: string };

export type Analytics = {
  days: number; from: string; to: string; tracked: boolean;
  totals: Totals; prev: Totals;
  series: DayPoint[];
  funnel: { key: string; label: string; value: number }[];
  sources: { key: string; label: string; value: number }[];
  devices: { mobile: number; desktop: number };
  channels: { key: string; label: string; value: number }[];
  /** [день тижня 0=Пн][година] → перегляди */
  heatmap: number[][];
  peak: { day: number; hour: number } | null;
  responseHours: number | null; handledShare: number; openLeads: number;
  listings: ListingStat[];
  developments: DevStat[];
  agents: AgentStat[];
  areas: AreaStat[];
  insights: Insight[];
};

const SOURCE_LABELS: Record<string, string> = {
  internal: 'Resoha search', direct: 'Direct / bookmarks', search: 'Google & search',
  social: 'Social media', messenger: 'WhatsApp & messengers', other: 'Other sites',
};
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', phone: 'Phone shown', form: 'Viewing request', visit: 'Office visit booked', viber: 'Viber',
  telegram: 'Telegram', share: 'Link copied', favorite: 'Saved',
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

function totalsOf(events: Row[], leads: Row[]): Totals {
  const views = events.filter((e) => e.kind === 'view' || e.kind === 'dev_view');
  const visitors = new Set(views.map((e) => e.visitor)).size;
  const contacts = new Set(events.filter((e) => isContact(e.kind)).map((e) => `${e.visitor}|${e.listing_id}`)).size;
  return {
    views: views.length, visitors, contacts, leads: leads.length,
    favorites: events.filter((e) => e.kind === 'favorite').length,
    conversion: pct(leads.length, visitors),
  };
}

export function buildAnalytics(input: {
  days: number; listings: Listing[]; events: Row[]; leads: Row[]; devs: Row[]; members: Agent[];
  market: Row[]; now?: number;
}): Analytics {
  const { days, listings, devs, members, market } = input;
  const now = input.now ?? Date.now();
  const fromMs = now - days * DAY;
  const inCur = (r: Row) => new Date(r.created_at).getTime() >= fromMs;
  const events = input.events.filter(inCur);
  const prevEvents = input.events.filter((r) => !inCur(r));
  const leads = input.leads.filter(inCur);
  const prevLeads = input.leads.filter((r) => !inCur(r));

  const totals = totalsOf(events, leads);
  const prev = totalsOf(prevEvents, prevLeads);

  // --- по днях
  const keys: string[] = [];
  for (let t = fromMs + DAY; t <= now + 1; t += DAY) keys.push(dayKey(new Date(t).toISOString()));
  const idx = new Map(keys.map((k, i) => [k, i]));
  const series: DayPoint[] = keys.map((date) => ({ date, views: 0, visitors: 0, contacts: 0, leads: 0 }));
  const dayVisitors = keys.map(() => new Set<string>());
  for (const e of events) {
    const i = idx.get(dayKey(e.created_at));
    if (i === undefined) continue;
    if (e.kind === 'view' || e.kind === 'dev_view') { series[i].views += 1; dayVisitors[i].add(e.visitor); }
    else if (isContact(e.kind)) series[i].contacts += 1;
  }
  dayVisitors.forEach((s, i) => { series[i].visitors = s.size; });
  for (const l of leads) { const i = idx.get(dayKey(l.created_at)); if (i !== undefined) series[i].leads += 1; }

  // --- воронка, джерела, пристрої, канали
  const funnel = [
    { key: 'views', label: 'Views', value: totals.views },
    { key: 'visitors', label: 'Unique visitors', value: totals.visitors },
    { key: 'contacts', label: 'Opened contacts', value: totals.contacts },
    { key: 'leads', label: 'Leads', value: totals.leads },
  ];
  const viewEvents = events.filter((e) => e.kind === 'view' || e.kind === 'dev_view');
  const srcCount: Record<string, number> = {};
  viewEvents.forEach((e) => { srcCount[e.source] = (srcCount[e.source] ?? 0) + 1; });
  const sources = Object.entries(srcCount).sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, label: SOURCE_LABELS[key] ?? key, value }));
  const devices = {
    mobile: viewEvents.filter((e) => e.device === 'mobile').length,
    desktop: viewEvents.filter((e) => e.device !== 'mobile').length,
  };
  const chCount: Record<string, number> = {};
  events.forEach((e) => {
    if (['phone', 'viber', 'telegram', 'share', 'favorite'].includes(e.kind)) chCount[e.kind] = (chCount[e.kind] ?? 0) + 1;
  });
  // WhatsApp, форма й запис на візит — це заявки: беремо з leads, щоб цифри збігались із вкладкою Leads
  leads.forEach((l) => { const k = l.channel === 'whatsapp' || l.channel === 'visit' ? l.channel : 'form'; chCount[k] = (chCount[k] ?? 0) + 1; });
  const channels = Object.entries(chCount).sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, label: CHANNEL_LABELS[key] ?? key, value }));

  // --- коли дивляться
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  viewEvents.forEach((e) => {
    const d = local(e.created_at);
    heatmap[(d.getUTCDay() + 6) % 7][d.getUTCHours()] += 1;
  });
  let peak: Analytics['peak'] = null;
  let best = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) if (heatmap[d][h] > best) { best = heatmap[d][h]; peak = { day: d, hour: h }; }
  }

  // --- швидкість відповіді
  const handledLeads = leads.filter((l) => l.handled_at);
  const responseOf = (ls: Row[]) => {
    const hrs = ls.filter((l) => l.handled_at)
      .map((l) => (new Date(l.handled_at).getTime() - new Date(l.created_at).getTime()) / 3600000);
    return hrs.length ? Math.round(median(hrs) * 10) / 10 : null;
  };
  const responseHours = responseOf(handledLeads);
  const handledShare = pct(leads.filter((l) => l.status !== 'new').length, leads.length);
  const openLeads = input.leads.filter((l) => l.status === 'new').length;

  // --- ринок: медіана $/ft² за типом і районом (лише продаж)
  const marketBy = new Map<string, number[]>();
  market.filter((m) => m.deal === 'sale').forEach((m) => {
    const k = `${m.type}|${m.neighborhood}`;
    const arr = marketBy.get(k) ?? [];
    arr.push(Number(m.price) / Number(m.sqft));
    marketBy.set(k, arr);
  });

  // --- оголошення
  const perListing = new Map<string, Row[]>();
  events.forEach((e) => { if (e.listing_id) { const a = perListing.get(e.listing_id) ?? []; a.push(e); perListing.set(e.listing_id, a); } });
  const leadsPer = new Map<string, number>();
  leads.forEach((l) => leadsPer.set(l.listing_id, (leadsPer.get(l.listing_id) ?? 0) + 1));

  const listingStats: ListingStat[] = listings.map((l) => {
    const ev = perListing.get(l.id) ?? [];
    const views = ev.filter((e) => e.kind === 'view');
    const visitors = new Set(views.map((e) => e.visitor)).size;
    const lc = leadsPer.get(l.id) ?? 0;
    const trend = keys.map(() => 0);
    views.forEach((e) => { const i = idx.get(dayKey(e.created_at)); if (i !== undefined) trend[i] += 1; });
    const ppsf = l.deal === 'sale' && l.sqft > 0 && l.price > 0 ? l.price / l.sqft : 0;
    const peers = marketBy.get(`${l.type}|${l.neighborhood}`) ?? [];
    // сам обʼєкт теж у вибірці ринку; без трьох сусідів порівняння нічого не каже
    const marketPpsf = peers.length >= 3 ? median(peers) : 0;
    const priceDelta = ppsf && marketPpsf ? Math.round(((ppsf - marketPpsf) / marketPpsf) * 100) : null;
    const flags: ListingStat['flags'] = [];
    if (priceDelta !== null && priceDelta >= 20) flags.push('overpriced');
    if (priceDelta !== null && priceDelta <= -20) flags.push('underpriced');
    if (l.active && views.length >= 15 && lc === 0) flags.push('no_leads');
    if (l.active && views.length === 0 && days >= 7) flags.push('no_views');
    if (l.photos.length < 5) flags.push('few_photos');
    return {
      id: l.id, title: l.title, photo: l.photos[0] ?? '', price: l.price, deal: l.deal, type: l.type,
      neighborhood: l.neighborhood, active: l.active, status: l.status, agentId: l.agentId, development: l.development,
      daysOnMarket: Math.max(0, Math.floor((now - new Date(l.createdAt).getTime()) / DAY)),
      allTimeViews: l.views,
      views: views.length, visitors,
      contacts: new Set(ev.filter((e) => isContact(e.kind)).map((e) => e.visitor)).size,
      leads: lc, favorites: ev.filter((e) => e.kind === 'favorite').length,
      conversion: pct(lc, visitors), trend,
      ppsf: Math.round(ppsf), marketPpsf: Math.round(marketPpsf), priceDelta, flags,
    };
  }).sort((a, b) => b.views - a.views || b.allTimeViews - a.allTimeViews);

  // --- ЖК
  const devMap = new Map<string, DevStat>();
  const devOf = (id: string, name = '', slug = '') => {
    let d = devMap.get(id);
    if (!d) { d = { id, name, slug, pageViews: 0, unitViews: 0, contacts: 0, leads: 0, units: 0, available: 0, sold: 0 }; devMap.set(id, d); }
    if (!d.name && name) { d.name = name; d.slug = slug; }
    return d;
  };
  devs.forEach((d) => devOf(d.id, d.name, d.slug));
  const listingDev = new Map<string, string>();
  listings.forEach((l) => {
    if (!l.developmentId) return;
    listingDev.set(l.id, l.developmentId);
    const d = devOf(l.developmentId, l.development?.name, l.development?.slug);
    d.units += 1;
    if (l.status === 'sold' || l.status === 'rented') d.sold += 1;
    else if (l.status === 'available') d.available += 1;
  });
  events.forEach((e) => {
    const id = e.development_id ?? (e.listing_id ? listingDev.get(e.listing_id) : undefined);
    if (!id) return;
    const d = devOf(id);
    if (e.kind === 'dev_view') d.pageViews += 1;
    else if (e.kind === 'view') d.unitViews += 1;
    else if (isContact(e.kind)) d.contacts += 1;
  });
  leads.forEach((l) => { const id = listingDev.get(l.listing_id); if (id) devOf(id).leads += 1; });
  const developments = [...devMap.values()].filter((d) => d.name)
    .sort((a, b) => (b.pageViews + b.unitViews) - (a.pageViews + a.unitViews));

  // --- команда
  const agents: AgentStat[] = members.map((m) => {
    const mine = listingStats.filter((l) => l.agentId === m.id);
    const ev = events.filter((e) => e.agent_id === m.id);
    const ld = leads.filter((l) => l.agent_id === m.id);
    const visitors = new Set(ev.filter((e) => e.kind === 'view').map((e) => e.visitor)).size;
    return {
      id: m.id, name: m.name, avatar: m.avatar, listings: mine.length, active: mine.filter((l) => l.active).length,
      views: ev.filter((e) => e.kind === 'view' || e.kind === 'dev_view').length,
      contacts: new Set(ev.filter((e) => isContact(e.kind)).map((e) => `${e.visitor}|${e.listing_id}`)).size,
      leads: ld.length, conversion: pct(ld.length, visitors),
      responseHours: responseOf(ld), handledShare: pct(ld.filter((l) => l.status !== 'new').length, ld.length),
    };
  }).sort((a, b) => b.leads - a.leads || b.views - a.views);

  // --- райони: мої $/ft² проти ринку
  const myBy = new Map<string, number[]>();
  listings.filter((l) => l.deal === 'sale' && l.sqft > 0 && l.price > 0)
    .forEach((l) => { const a = myBy.get(l.neighborhood) ?? []; a.push(l.price / l.sqft); myBy.set(l.neighborhood, a); });
  const mktArea = new Map<string, number[]>();
  market.filter((m) => m.deal === 'sale')
    .forEach((m) => { const a = mktArea.get(m.neighborhood) ?? []; a.push(Number(m.price) / Number(m.sqft)); mktArea.set(m.neighborhood, a); });
  const areas: AreaStat[] = [...myBy.entries()].map(([n, xs]) => ({
    neighborhood: n, mine: Math.round(median(xs)), market: Math.round(median(mktArea.get(n) ?? [])),
    myCount: xs.length, marketCount: (mktArea.get(n) ?? []).length,
  })).filter((a) => a.marketCount >= 3).sort((a, b) => b.myCount - a.myCount).slice(0, 8);

  // --- підказки
  const insights: Insight[] = [];
  const tracked = input.events.length > 0;
  const delta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const dv = delta(totals.views, prev.views);
  if (dv !== null && dv >= 15) insights.push({ tone: 'good', text: `Views are up ${dv}% on the previous ${days} days.` });
  if (dv !== null && dv <= -15) insights.push({ tone: 'warn', text: `Views are down ${-dv}% on the previous ${days} days. Fresh photos or a price update usually bring buyers back.` });
  const noLeads = listingStats.filter((l) => l.flags.includes('no_leads'));
  if (noLeads.length) insights.push({ tone: 'warn', text: `${noLeads.length} listing${noLeads.length > 1 ? 's get' : ' gets'} plenty of views but no leads: “${noLeads[0].title}” first. Check the price and the first photo.` });
  const over = listingStats.filter((l) => l.flags.includes('overpriced'));
  if (over.length) insights.push({ tone: 'warn', text: `${over.length} listing${over.length > 1 ? 's are' : ' is'} priced 20%+ above the area median per ft².` });
  const thin = listingStats.filter((l) => l.active && l.flags.includes('few_photos')).length;
  if (thin) insights.push({ tone: 'info', text: `${thin} active listing${thin > 1 ? 's have' : ' has'} fewer than 5 photos. Photos are the first thing buyers judge a listing by.` });
  if (openLeads > 0) insights.push({ tone: 'warn', text: `${openLeads} lead${openLeads > 1 ? 's are' : ' is'} still waiting for a reply.` });
  if (responseHours !== null && responseHours <= 2) insights.push({ tone: 'good', text: `You answer leads in ${fmtHours(responseHours)} on median. Fast replies win viewings.` });
  if (totals.views >= 20 && devices.mobile / Math.max(1, totals.views) >= 0.6) {
    insights.push({ tone: 'info', text: `${Math.round((devices.mobile / totals.views) * 100)}% of buyers browse on a phone. Make sure WhatsApp is set in your profile.` });
  }
  const pk = peak as Analytics['peak'];
  if (pk && best >= 5) insights.push({ tone: 'info', text: `Buyers look most on ${WEEKDAYS[pk.day]}s around ${hourLabel(pk.hour)}. A good time to publish or drop a price.` });

  return {
    days, from: new Date(fromMs).toISOString(), to: new Date(now).toISOString(), tracked,
    totals, prev, series, funnel, sources, devices, channels, heatmap, peak,
    responseHours, handledShare, openLeads,
    listings: listingStats, developments, agents, areas, insights,
  };
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
export function fmtHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h / 24)} days`;
}
