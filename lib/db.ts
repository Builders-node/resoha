import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase/server';
import type { Agency, Agent, Deal, Lead, Listing, ListingQuery, Review, SavedSearch } from './types';

/**
 * Дані живуть у Supabase. Права перевіряє RLS, тому всі запити йдуть
 * від імені користувача — тут немає жодного сервісного ключа.
 */
type DB = SupabaseClient;
const db = async (): Promise<DB> => supabaseServer();

/* ---------- mappers ---------- */
type Row = Record<string, any>;

export const mapAgency = (r: Row): Agency => ({
  id: r.id, name: r.name, brand: r.brand, phone: r.phone, email: r.email, about: r.about,
  verified: r.verified, ownerId: r.owner_id, inviteCode: r.invite_code ?? '', createdAt: r.created_at,
});

export const mapAgent = (r: Row): Agent => ({
  id: r.id, role: r.role, name: r.name, email: r.email, avatar: r.avatar,
  phone: r.phone, whatsapp: r.whatsapp, createdAt: r.created_at, active: r.active,
  agencyId: r.agency_id, isOwner: r.is_owner,
  agency: r.agency?.name ?? (r.agency_id ? '' : 'Independent agent'),
  experience: r.experience, rating: Number(r.rating), reviews: r.reviews,
  verified: r.verified, languages: r.languages ?? [], about: r.about,
});

export const mapListing = (r: Row): Listing => ({
  id: r.id, deal: r.deal, type: r.type, title: r.title, island: r.island,
  neighborhood: r.neighborhood, address: r.address, price: Number(r.price), hoa: Number(r.hoa),
  beds: r.beds, baths: Number(r.baths), sqft: r.sqft, lotAcres: Number(r.lot_acres), year: r.year,
  oceanfront: r.oceanfront, titled: r.titled, ownerFinancing: r.owner_financing,
  lat: r.lat, lng: r.lng, agentId: r.agent_id, agencyId: r.agency_id,
  featured: r.featured, active: r.active, views: r.views,
  createdAt: r.created_at, tags: r.tags ?? [], photos: r.photos ?? [], text: r.body ?? '',
});

const mapLead = (r: Row): Lead => ({
  id: r.id, listingId: r.listing_id, agentId: r.agent_id, agencyId: r.agency_id,
  userId: r.user_id ?? null, name: r.name, phone: r.phone, email: r.email ?? '',
  message: r.message, createdAt: r.created_at, status: r.status,
  listingTitle: r.listing?.title ?? '', agentName: r.agent?.name ?? '',
});

const AGENT_COLS = '*, agency:agencies!profiles_agency_id_fkey(name)';

/* ---------- profiles / agents ---------- */
export async function getAgent(id: string): Promise<Agent | null> {
  const { data } = await (await db()).from('profiles').select(AGENT_COLS).eq('id', id).maybeSingle();
  return data ? mapAgent(data) : null;
}

export async function listAgents(): Promise<Agent[]> {
  const { data } = await (await db()).from('profiles').select(AGENT_COLS).eq('role', 'agent').order('reviews', { ascending: false });
  return (data ?? []).map(mapAgent);
}

export async function agencyMembers(agencyId: string): Promise<Agent[]> {
  const { data } = await (await db()).from('profiles').select(AGENT_COLS).eq('agency_id', agencyId).eq('role', 'agent');
  return (data ?? []).map(mapAgent);
}

/* ---------- agencies ---------- */
export async function getAgency(id: string | null): Promise<Agency | null> {
  if (!id) return null;
  const { data } = await (await db()).from('agencies').select('*').eq('id', id).maybeSingle();
  return data ? mapAgency(data) : null;
}

export async function agencyBoard() {
  const { data } = await (await db())
    .from('agency_board').select('*').order('listings_count', { ascending: false });
  return (data ?? []).map((r: Row) => ({
    agency: mapAgency(r),
    listings: Number(r.listings_count),
    agents: Number(r.agents_count),
  }));
}

/* ---------- listings ---------- */
/** Спільні фільтри для вибірки та для лічильників — щоб критерії не розʼїхались. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(sel: any, q: ListingQuery) {
  if (!q.includeInactive) sel = sel.eq('active', true);
  if (q.ids?.length) sel = sel.in('id', q.ids);
  if (q.deal) sel = sel.eq('deal', q.deal);
  if (q.type) sel = sel.eq('type', q.type);
  if (q.island) sel = sel.eq('island', q.island);
  if (q.neighborhoods?.length) sel = sel.in('neighborhood', q.neighborhoods);
  if (q.agentId) sel = sel.eq('agent_id', q.agentId);
  if (q.agencyId) sel = sel.eq('agency_id', q.agencyId);
  if (q.bathsMin) sel = sel.gte('baths', q.bathsMin);
  if (q.priceMin) sel = sel.gte('price', q.priceMin);
  if (q.priceMax) sel = sel.lte('price', q.priceMax);
  if (q.sqftMin) sel = sel.gte('sqft', q.sqftMin);
  if (q.sqftMax) sel = sel.gt('sqft', 0).lte('sqft', q.sqftMax);
  if (q.lotMin) sel = sel.gte('lot_acres', q.lotMin);
  if (q.lotMax) sel = sel.gt('lot_acres', 0).lte('lot_acres', q.lotMax);
  if (q.hoaMax !== undefined) sel = sel.lte('hoa', q.hoaMax);
  if (q.yearMin) sel = sel.gte('year', q.yearMin);
  if (q.oceanfront) sel = sel.eq('oceanfront', true);
  if (q.titled) sel = sel.eq('titled', true);
  if (q.ownerFinancing) sel = sel.eq('owner_financing', true);
  if (q.tags?.length) sel = sel.contains('tags', q.tags);
  if (q.beds?.length) {
    // 4 у фільтрі означає «4+»
    sel = sel.or(q.beds.map((b) => (b >= 4 ? 'beds.gte.4' : `beds.eq.${b}`)).join(','));
  }
  if (q.q) {
    // значення в or() беремо в лапки — інакше пробіли ламають розбір фільтра на боці PostgREST
    const s = `"%${q.q.replace(/["\\]/g, '')}%"`;
    sel = sel.or(`title.ilike.${s},address.ilike.${s},neighborhood.ilike.${s},body.ilike.${s}`);
  }
  return sel;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(sel: any, sort: ListingQuery['sort']) {
  switch (sort) {
    case 'price_asc': return sel.order('price', { ascending: true });
    case 'price_desc': return sel.order('price', { ascending: false });
    case 'sqft_desc': return sel.order('sqft', { ascending: false });
    case 'popular': return sel.order('views', { ascending: false });
    case 'new': return sel.order('created_at', { ascending: false });
    default: return sel.order('featured', { ascending: false }).order('created_at', { ascending: false });
  }
}

export const PAGE_SIZE = 24;

/** Сторінка результатів + скільки всього збігів (для «показати ще» і лічильника). */
export async function searchListings(q: ListingQuery = {}, page = 0, pageSize = PAGE_SIZE) {
  const from = page * pageSize;
  let sel = applyFilters((await db()).from('listings').select('*', { count: 'exact' }), q);
  sel = applySort(sel, q.sort).range(from, from + pageSize - 1);

  const { data, error, count } = await sel;
  if (error) throw error;
  const items = (data ?? []).map(mapListing);
  return { items, total: count ?? items.length, hasMore: from + items.length < (count ?? 0) };
}

/** Координати всіх збігів — щоб карта показувала повну картину, а список вантажився сторінками. */
export async function queryPins(q: ListingQuery = {}) {
  const sel = applyFilters((await db()).from('listings').select('id, lat, lng, price, deal'), q);
  const { data, error } = await sel.limit(2000);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ id: r.id, lat: r.lat, lng: r.lng, price: Number(r.price), deal: r.deal }));
}

export async function queryListings(q: ListingQuery = {}): Promise<Listing[]> {
  let sel = applyFilters((await db()).from('listings').select('*'), q);
  sel = applySort(sel, q.sort);

  const { data, error } = await sel.limit(500);
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  const { data } = await (await db()).from('listings').select('*').eq('id', id).maybeSingle();
  return data ? mapListing(data) : null;
}

export async function createListing(input: Partial<Listing> & { agentId: string; agencyId: string | null }) {
  const { data, error } = await (await db()).from('listings').insert({
    deal: input.deal ?? 'sale',
    type: input.type ?? 'condo',
    title: input.title,
    island: input.island ?? 'Roatán',
    neighborhood: input.neighborhood ?? 'West Bay',
    address: input.address ?? '',
    price: Number(input.price) || 0,
    hoa: Number(input.hoa) || 0,
    beds: Number(input.beds) || 0,
    baths: Number(input.baths) || 0,
    sqft: Number(input.sqft) || 0,
    lot_acres: Number(input.lotAcres) || 0,
    year: Number(input.year) || 0,
    oceanfront: Boolean(input.oceanfront),
    titled: input.titled ?? true,
    owner_financing: Boolean(input.ownerFinancing),
    lat: Number(input.lat) || 16.3,
    lng: Number(input.lng) || -86.59,
    agent_id: input.agentId,
    agency_id: input.agencyId,
    tags: input.tags ?? [],
    photos: input.photos ?? [],
    body: input.text ?? '',
  }).select('*').single();
  if (error) throw error;
  return mapListing(data);
}

/** Мапа «поле форми → колонка», щоб редагування покривало всі поля оголошення. */
const LISTING_COLUMNS: Record<string, string> = {
  deal: 'deal', type: 'type', title: 'title', island: 'island', neighborhood: 'neighborhood',
  address: 'address', price: 'price', hoa: 'hoa', beds: 'beds', baths: 'baths', sqft: 'sqft',
  lotAcres: 'lot_acres', year: 'year', oceanfront: 'oceanfront', titled: 'titled',
  ownerFinancing: 'owner_financing', lat: 'lat', lng: 'lng', tags: 'tags', photos: 'photos',
  text: 'body', active: 'active',
};
const NUMERIC = new Set(['price', 'hoa', 'beds', 'baths', 'sqft', 'lotAcres', 'year', 'lat', 'lng']);
const BOOLEAN = new Set(['oceanfront', 'titled', 'ownerFinancing', 'active']);

export async function updateListing(id: string, patch: Partial<Listing>) {
  const row: Row = {};
  for (const [key, column] of Object.entries(LISTING_COLUMNS)) {
    const value = (patch as Row)[key];
    if (value === undefined) continue;
    row[column] = NUMERIC.has(key) ? Number(value) || 0 : BOOLEAN.has(key) ? Boolean(value) : value;
  }
  if (!Object.keys(row).length) return getListing(id);

  const { data, error } = await (await db()).from('listings').update(row).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapListing(data) : null;
}

export async function deleteListing(id: string) {
  const { error, count } = await (await db())
    .from('listings').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function bumpViews(id: string) {
  await (await db()).rpc('bump_views', { p_listing: id });
}

/* ---------- favorites ---------- */
export async function getFavorites(userId: string): Promise<string[]> {
  const { data } = await (await db()).from('favorites').select('listing_id').eq('user_id', userId);
  return (data ?? []).map((r: Row) => r.listing_id);
}

export async function toggleFavorite(userId: string, listingId: string): Promise<boolean> {
  const client = await db();
  const { data } = await client.from('favorites').select('listing_id')
    .eq('user_id', userId).eq('listing_id', listingId).maybeSingle();
  if (data) {
    await client.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    return false;
  }
  await client.from('favorites').insert({ user_id: userId, listing_id: listingId });
  return true;
}

/* ---------- leads ---------- */
export async function listLeads(): Promise<Lead[]> {
  // RLS сама віддає потрібний зріз: ріелтору — його заявки, власнику — по всій агенції,
  // покупцеві — ті, що він надіслав. Тягнемо назву обʼєкта й імʼя ріелтора одним запитом.
  const { data } = await (await db()).from('leads')
    .select('*, listing:listings(title), agent:profiles!leads_agent_id_fkey(name)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapLead);
}

export async function createLead(input: {
  listingId: string; name: string; phone: string; email?: string; message: string; userId?: string | null;
}): Promise<boolean> {
  const client = await db();
  const { data: listing } = await client.from('listings')
    .select('id, agent_id, agency_id').eq('id', input.listingId).maybeSingle();
  if (!listing) return false;

  // Без .select(): гість має право створити заявку, але не читати її — RLS поверне помилку на читанні
  const { error } = await client.from('leads').insert({
    listing_id: listing.id, agent_id: listing.agent_id, agency_id: listing.agency_id,
    user_id: input.userId ?? null,
    name: input.name, phone: input.phone, email: input.email ?? '', message: input.message,
  });
  if (error) throw error;
  return true;
}

/** Скільки обʼєктів підпадає під збережений пошук зараз і скільки зʼявилось після збереження. */
export async function countMatches(query: ListingQuery, since?: string) {
  const client = await db();
  const base = () => applyFilters(client.from('listings').select('id', { count: 'exact', head: true }), query);
  const [{ count: total }, fresh] = await Promise.all([
    base(),
    since ? base().gt('created_at', since) : Promise.resolve({ count: 0 }),
  ]);
  return { total: total ?? 0, fresh: fresh.count ?? 0 };
}

/* ---------- reviews ---------- */
export async function listReviews(agentId: string): Promise<Review[]> {
  const { data } = await (await db()).from('reviews')
    .select('*, author:profiles!reviews_author_id_fkey(name, avatar)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, agentId: r.agent_id, authorId: r.author_id, rating: r.rating,
    body: r.body, createdAt: r.created_at,
    authorName: r.author?.name ?? 'Guest', authorAvatar: r.author?.avatar ?? '',
  }));
}

export async function createReview(input: {
  agentId: string; authorId: string; rating: number; body: string;
}): Promise<Review | null> {
  const { data, error } = await (await db()).from('reviews')
    .upsert({
      agent_id: input.agentId, author_id: input.authorId,
      rating: input.rating, body: input.body,
    }, { onConflict: 'agent_id,author_id' })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id, agentId: data.agent_id, authorId: data.author_id, rating: data.rating,
    body: data.body, createdAt: data.created_at, authorName: '', authorAvatar: '',
  };
}

/* ---------- saved searches ---------- */
export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const { data } = await (await db()).from('saved_searches').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false });
  return (data ?? []).map((r: Row) => ({
    id: r.id, userId: r.user_id, title: r.title, query: r.query, createdAt: r.created_at,
  }));
}

export async function createSavedSearch(userId: string, title: string, query: string) {
  const { data, error } = await (await db()).from('saved_searches')
    .insert({ user_id: userId, title, query }).select('*').single();
  if (error) throw error;
  return { id: data.id, userId: data.user_id, title: data.title, query: data.query, createdAt: data.created_at };
}

export async function deleteSavedSearch(id: string) {
  const { error } = await (await db()).from('saved_searches').delete().eq('id', id);
  return !error;
}

/* ---------- dashboard ---------- */
export async function agentStats(agentId: string, agencyId: string | null, scope: 'own' | 'agency') {
  const client = await db();
  let sel = client.from('listings').select('active, views');
  sel = scope === 'agency' && agencyId ? sel.eq('agency_id', agencyId) : sel.eq('agent_id', agentId);
  const { data: rows } = await sel;

  let leadSel = client.from('leads').select('status, agent_id');
  if (scope === 'own') leadSel = leadSel.eq('agent_id', agentId);
  const { data: leads } = await leadSel;

  return {
    total: rows?.length ?? 0,
    active: rows?.filter((r: Row) => r.active).length ?? 0,
    views: rows?.reduce((s: number, r: Row) => s + r.views, 0) ?? 0,
    leads: leads?.length ?? 0,
    newLeads: leads?.filter((l: Row) => l.status === 'new').length ?? 0,
  };
}

/* ---------- facets ---------- */
export async function facets(q: { deal?: Deal; type?: string } = {}) {
  let sel = (await db()).from('listings')
    .select('price, sqft, lot_acres, tags, neighborhood, oceanfront, titled, owner_financing, hoa')
    .eq('active', true);
  if (q.deal) sel = sel.eq('deal', q.deal);
  if (q.type) sel = sel.eq('type', q.type);
  const { data } = await sel.limit(1000);
  const rows = (data ?? []) as Row[];

  const prices = rows.map((r) => Number(r.price)).sort((a, b) => a - b);
  const priceMin = prices[0] ?? 0;
  const priceMax = prices[prices.length - 1] ?? 0;
  const BINS = 34;
  const step = (priceMax - priceMin) / BINS || 1;
  const histogram = Array.from({ length: BINS }, () => 0);
  prices.forEach((p) => { histogram[Math.min(BINS - 1, Math.floor((p - priceMin) / step))] += 1; });

  const sqfts = rows.filter((r) => r.sqft > 0).map((r) => r.sqft);
  const lots = rows.filter((r) => Number(r.lot_acres) > 0).map((r) => Number(r.lot_acres));

  const tagCounts: Record<string, number> = {};
  rows.forEach((r) => (r.tags ?? []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }));
  const areaCounts: Record<string, number> = {};
  rows.forEach((r) => { areaCounts[r.neighborhood] = (areaCounts[r.neighborhood] ?? 0) + 1; });

  return {
    total: rows.length,
    price: { min: Math.floor(priceMin), max: Math.ceil(priceMax), histogram },
    sqft: { min: Math.min(...sqfts, 0), max: Math.max(...sqfts, 0) },
    lot: { min: lots.length ? Math.min(...lots) : 0, max: lots.length ? Math.max(...lots) : 0 },
    tags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    areas: Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    oceanfront: rows.filter((r) => r.oceanfront).length,
    titled: rows.filter((r) => r.titled).length,
    ownerFinancing: rows.filter((r) => r.owner_financing).length,
    noHoa: rows.filter((r) => Number(r.hoa) === 0).length,
  };
}
