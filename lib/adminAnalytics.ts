import { buildAnalytics, type Analytics, type AgentStat } from './analytics';
import type { Agent, Listing } from './types';

/**
 * Аналітика всієї платформи для адміна. Основу (трафік, воронка, джерела, оголошення, ЖК,
 * ріелтори) рахує той самий buildAnalytics, що й кабінет агенції; тут — те, що бачить лише
 * адмін: зростання (реєстрації, нові оголошення), агенції, попит із пошуку, здоровʼя заявок.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const DAY = 86400000;
const TZ_SHIFT = -6 * 3600000;
const dayKey = (iso: string) => new Date(new Date(iso).getTime() + TZ_SHIFT).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type GrowthPoint = { date: string; signups: number; agents: number; listings: number; searches: number };

export type AgencyStat = {
  id: string; name: string; verified: boolean; agents: number; listings: number; active: number;
  views: number; contacts: number; leads: number; conversion: number;
  responseHours: number | null; handledShare: number; openLeads: number;
};

export type DemandRow = { key: string; label: string; searches: number; supply: number; ratio: number | null };

export type AdminAnalytics = Analytics & {
  growth: GrowthPoint[];
  people: {
    total: number; agents: number; buyers: number; newUsers: number; newUsersPrev: number;
    newAgents: number; newAgentsPrev: number; verifiedAgents: number;
  };
  supply: {
    listings: number; active: number; newListings: number; newListingsPrev: number;
    byType: { key: string; label: string; value: number }[];
  };
  leadHealth: { total: number; open: number; within24h: number; overdue: number };
  agencies: AgencyStat[];
  demand: {
    searches: number; searchesPrev: number; zeroResults: number; visitors: number;
    areas: DemandRow[]; types: { key: string; label: string; value: number }[];
    deals: { key: string; label: string; value: number }[];
    prices: { key: string; label: string; value: number }[];
    beds: { key: string; label: string; value: number }[];
    queries: { q: string; count: number; zero: number }[];
    zeroCombos: { label: string; count: number }[];
  };
};

const TYPE_LABEL: Record<string, string> = { house: 'Houses', condo: 'Condos', land: 'Land', commercial: 'Commercial', villa: 'Villas' };

const PRICE_BANDS: [number, string][] = [
  [100000, 'Under $100K'], [250000, '$100K–250K'], [500000, '$250K–500K'], [1000000, '$500K–1M'], [Infinity, '$1M+'],
];
/** Ціновий діапазон пошуку — за його «стелею» (а без стелі — за нижньою межею). */
function priceBand(min: number | null, max: number | null): string | null {
  const v = max ?? min;
  if (v === null || v === undefined) return null;
  return PRICE_BANDS.find(([cap]) => Number(v) < cap)?.[1] ?? null;
}

function count<T>(xs: T[], key: (x: T) => string | string[] | null | undefined) {
  const m = new Map<string, number>();
  xs.forEach((x) => {
    const k = key(x);
    (Array.isArray(k) ? k : k ? [k] : []).forEach((kk) => m.set(kk, (m.get(kk) ?? 0) + 1));
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function buildAdminAnalytics(input: {
  days: number; listings: Listing[]; events: Row[]; leads: Row[]; devs: Row[];
  people: Row[]; agencies: Row[]; searches: Row[]; market: Row[]; now?: number;
}): AdminAnalytics {
  const { days, listings, events, leads, devs, people, agencies, searches } = input;
  const now = input.now ?? Date.now();
  const fromMs = now - days * DAY;
  const t = (r: Row) => new Date(r.created_at).getTime();
  const inCur = (r: Row) => t(r) >= fromMs;
  const inPrev = (r: Row) => t(r) >= fromMs - days * DAY && t(r) < fromMs;

  // ріелтори платформи — «команда» для рейтингу
  const agents = people.filter((p) => p.role === 'agent')
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar ?? '' }) as Agent);
  const base = buildAnalytics({ days, listings, events, leads, devs, members: agents, market: input.market, now });

  // --- зростання по днях
  const keys = base.series.map((s) => s.date);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const growth: GrowthPoint[] = keys.map((date) => ({ date, signups: 0, agents: 0, listings: 0, searches: 0 }));
  const bump = (iso: string, k: keyof Omit<GrowthPoint, 'date'>) => {
    const i = idx.get(dayKey(iso));
    if (i !== undefined && new Date(iso).getTime() >= fromMs) growth[i][k] += 1;
  };
  people.forEach((p) => { bump(p.created_at, 'signups'); if (p.role === 'agent') bump(p.created_at, 'agents'); });
  listings.forEach((l) => bump(l.createdAt, 'listings'));
  searches.forEach((s) => bump(s.created_at, 'searches'));

  const created = (iso: string) => ({ created_at: iso });
  const agentRows = people.filter((p) => p.role === 'agent');

  // --- заявки: чи на них відповідають
  const curLeads = leads.filter(inCur);
  const within24h = curLeads.filter((l) => l.handled_at && new Date(l.handled_at).getTime() - t(l) <= DAY).length;
  const overdue = leads.filter((l) => l.status === 'new' && now - t(l) > DAY).length;

  // --- агенції
  const curEvents = events.filter(inCur);
  const agencyStats: AgencyStat[] = [...agencies.map((a) => ({ id: a.id, name: a.name, verified: !!a.verified })),
    { id: '', name: 'Independent agents', verified: false }].map((a) => {
    const of = (r: Row) => (r.agency_id ?? r.agencyId ?? '') === a.id;
    const ls = listings.filter(of);
    const ev = curEvents.filter(of);
    const ld = curLeads.filter(of);
    const visitors = new Set(ev.filter((e) => e.kind === 'view').map((e) => e.visitor)).size;
    const hrs = ld.filter((l) => l.handled_at).map((l) => (new Date(l.handled_at).getTime() - t(l)) / 3600000);
    return {
      id: a.id, name: a.name, verified: a.verified,
      agents: agentRows.filter((p) => (p.agency_id ?? '') === a.id).length,
      listings: ls.length, active: ls.filter((l) => l.active).length,
      views: ev.filter((e) => e.kind === 'view' || e.kind === 'dev_view').length,
      contacts: new Set(ev.filter((e) => ['phone', 'whatsapp', 'viber', 'telegram', 'form_open'].includes(e.kind))
        .map((e) => `${e.visitor}|${e.listing_id}`)).size,
      leads: ld.length, conversion: pct(ld.length, visitors),
      responseHours: hrs.length ? Math.round(median(hrs) * 10) / 10 : null,
      handledShare: pct(ld.filter((l) => l.status !== 'new').length, ld.length),
      openLeads: leads.filter((l) => of(l) && l.status === 'new').length,
    };
  }).filter((a) => a.listings > 0 || a.agents > 0 || a.leads > 0)
    .sort((a, b) => b.leads - a.leads || b.views - a.views || b.listings - a.listings);

  // --- попит
  const cur = searches.filter(inCur);
  const supplyByArea = new Map<string, number>();
  listings.filter((l) => l.active).forEach((l) => supplyByArea.set(l.neighborhood, (supplyByArea.get(l.neighborhood) ?? 0) + 1));
  const areas: DemandRow[] = count(cur, (s) => s.areas as string[]).slice(0, 12).map(([key, n]) => {
    const supply = supplyByArea.get(key) ?? 0;
    return { key, label: key, searches: n, supply, ratio: supply ? Math.round((n / supply) * 10) / 10 : null };
  });
  const toItems = (rows: [string, number][], label: (k: string) => string = (k) => k) =>
    rows.map(([key, value]) => ({ key, label: label(key), value }));
  const queries = count(cur.filter((s) => s.q), (s) => s.q).slice(0, 15)
    .map(([q, c]) => ({ q, count: c, zero: cur.filter((s) => s.q === q && s.results === 0).length }));
  const zeroCombos = count(cur.filter((s) => s.results === 0), (s) => [
    s.deal === 'rent' ? 'Rent' : s.deal === 'sale' ? 'Sale' : '',
    TYPE_LABEL[s.type] ?? s.type,
    (s.areas ?? []).join(', '),
    priceBand(s.price_min, s.price_max) ?? '',
    (s.beds ?? []).length ? `${(s.beds as number[]).join('/')} BR` : '',
    s.q ? `“${s.q}”` : '',
  ].filter(Boolean).join(' · ') || 'Any').slice(0, 10).map(([label, c]) => ({ label, count: c }));

  // --- підказки для адміна (агентські з buildAnalytics тут не пасують: «you answer leads…»)
  const insights: Analytics['insights'] = [];
  const hot = areas.filter((a) => a.ratio !== null && a.searches >= 5).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0];
  if (hot) insights.push({ tone: 'info', text: `${hot.label} is the hottest area: ${hot.searches} searches for ${hot.supply} active listings. Worth asking agencies for more stock there.` });
  const empty = areas.find((a) => a.supply === 0 && a.searches >= 3);
  if (empty) insights.push({ tone: 'warn', text: `Buyers searched ${empty.label} ${empty.searches} times, but there is nothing listed there.` });
  if (cur.length >= 10 && cur.filter((s) => s.results === 0).length / cur.length >= 0.15) {
    insights.push({ tone: 'warn', text: `${Math.round((cur.filter((s) => s.results === 0).length / cur.length) * 100)}% of searches find nothing. See “Searches with no results” below.` });
  }
  if (overdue > 0) insights.push({ tone: 'warn', text: `${overdue} lead${overdue > 1 ? 's have' : ' has'} waited over 24 hours without a reply.` });
  const silent = agencyStats.filter((a) => a.id && a.listings > 0 && a.views === 0);
  if (silent.length && curEvents.length > 50) insights.push({ tone: 'info', text: `${silent.length} agenc${silent.length > 1 ? 'ies have' : 'y has'} listings with no views in this period.` });
  const dv = base.prev.views > 0 ? Math.round(((base.totals.views - base.prev.views) / base.prev.views) * 100) : null;
  if (dv !== null && Math.abs(dv) >= 15) insights.push({ tone: dv > 0 ? 'good' : 'warn', text: `Platform views are ${dv > 0 ? 'up' : 'down'} ${Math.abs(dv)}% on the previous ${days} days.` });
  const top = base.sources[0];
  if (top && base.totals.views >= 20) insights.push({ tone: 'info', text: `Most visits come from ${top.label.toLowerCase()} (${Math.round((top.value / base.totals.views) * 100)}%).` });

  return {
    ...base,
    insights,
    growth,
    people: {
      total: people.length,
      agents: agentRows.length,
      buyers: people.filter((p) => p.role !== 'agent').length,
      newUsers: people.filter((p) => inCur(p)).length,
      newUsersPrev: people.filter((p) => inPrev(p)).length,
      newAgents: agentRows.filter((p) => inCur(p)).length,
      newAgentsPrev: agentRows.filter((p) => inPrev(p)).length,
      verifiedAgents: agentRows.filter((p) => p.verified).length,
    },
    supply: {
      listings: listings.length,
      active: listings.filter((l) => l.active).length,
      newListings: listings.filter((l) => inCur(created(l.createdAt))).length,
      newListingsPrev: listings.filter((l) => inPrev(created(l.createdAt))).length,
      byType: toItems(count(listings.filter((l) => l.active), (l) => l.type), (k) => TYPE_LABEL[k] ?? k),
    },
    leadHealth: { total: curLeads.length, open: leads.filter((l) => l.status === 'new').length, within24h, overdue },
    agencies: agencyStats,
    demand: {
      searches: cur.length,
      searchesPrev: searches.filter(inPrev).length,
      zeroResults: cur.filter((s) => s.results === 0).length,
      visitors: new Set(cur.map((s) => s.visitor)).size,
      areas,
      types: toItems(count(cur, (s) => s.type || 'any'), (k) => (k === 'any' ? 'Any type' : TYPE_LABEL[k] ?? k)),
      deals: toItems(count(cur, (s) => s.deal || 'any'), (k) => (k === 'sale' ? 'Buy' : k === 'rent' ? 'Rent' : 'Any')),
      // бюджет — лише для купівлі: оренда в місяць на тій самій шкалі нічого не означає
      prices: toItems(count(cur.filter((s) => s.deal !== 'rent'), (s) => priceBand(s.price_min, s.price_max) ?? 'Any budget')),
      beds: toItems(count(cur, (s) => ((s.beds ?? []) as number[]).map((b) => (b >= 4 ? '4+ BR' : b === 0 ? 'Studio' : `${b} BR`)))),
      queries,
      zeroCombos,
    },
  };
}

export type { AgentStat };
