import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase/server';
import { QUALITY_CHECKS, type QualityKey } from './quality';
import { cleanDetails } from './details';
import { cleanNearby } from './nearby';
import { cleanPhotoRooms } from './rooms';
import { OPEN_STATUSES, cleanDocKind, cleanRentals, cleanStage, cleanSales, cleanStatus, slugify, splitList } from './units';
import { cleanSchedule } from './visits';
import type { ImportedListing } from './listingImport';
import type { ExistingUnit } from './priceList';
import type { AdminLogEntry, Agency, Agent, Building, Deal, Developer, Development, DevelopmentDocument, DevelopmentNews, ProgressEntry, LandFacts, Lead, Listing, ListingQuery, ListingReport, ListingReview, NotifySettings, PricePoint, ReportReason, Review, SavedSearch, SiteSettings, StatRow } from './types';

/**
 * Дані живуть у Supabase. Права перевіряє RLS, тому всі запити йдуть
 * від імені користувача — тут немає жодного сервісного ключа.
 */
type DB = SupabaseClient;
const db = async (): Promise<DB> => supabaseServer();

/* ---------- mappers ---------- */
// Рядок PostgREST: форма залежить від select, тож типізувати його жорстко нема сенсу
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Поверх: ціле число або нічого — порожнє поле форми не має ставати нулем */
const intOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
};

/**
 * Посилання на джерело потрапляє в href, тож пускаємо лише http(s):
 * інакше ріелтор міг би зберегти `javascript:` і воно б відрендерилось як лінк.
 */
const safeUrl = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^https?:\/\//i.test(s) ? s : '';
};
/** План квартири: зовнішнє посилання або файл із public/ сайту («/plans/duna-tower/201.png») */
const safePlan = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^\/(?!\/)[\w./-]+$/.test(s) && !s.includes('..') ? s : safeUrl(s);
};

export const mapAgency = (r: Row): Agency => ({
  id: r.id, name: r.name, brand: r.brand, phone: r.phone, email: r.email ?? '', about: r.about,
  verified: r.verified, ownerId: r.owner_id, inviteCode: r.invite_code ?? '', createdAt: r.created_at,
  featured: r.featured ?? false, featuredRank: r.featured_rank ?? 0,
});

export const mapAgent = (r: Row): Agent => ({
  id: r.id, role: r.role, name: r.name, email: r.email ?? '', avatar: r.avatar,
  phone: r.phone, whatsapp: r.whatsapp,
  // до міграції 0034 колонок немає — тоді порожньо
  viber: r.viber ?? '', telegram: r.telegram ?? '', createdAt: r.created_at, active: r.active,
  agencyId: r.agency_id, isOwner: r.is_owner, agencyRole: r.agency_role ?? null, isAdmin: r.is_admin ?? false,
  agency: r.agency?.name ?? (r.agency_id ? '' : 'Independent agent'),
  experience: r.experience, rating: Number(r.rating), reviews: r.reviews,
  verified: r.verified, languages: r.languages ?? [], about: r.about,
});

const mapLand = (r: Row | null | undefined): LandFacts | null => r ? ({
  titleStatus: r.title_status, survey: r.survey, roadAccess: r.road_access, power: r.power,
  water: r.water, zolitur: r.zolitur, zone: r.zone, slope: r.slope,
  // поля з міграції 0027: до її накату колонок немає — показуємо «Not confirmed»
  view: r.sea_view ?? 'unknown', beach: r.beach ?? 'unknown', internet: r.internet ?? 'unknown', flood: r.flood ?? 'unknown',
  ready: Boolean(r.ready), checkedAt: r.checked_at ?? null, checkedBy: r.checker?.name ?? '',
}) : null;

const mapListing = (r: Row): Listing => ({
  id: r.id, deal: r.deal, type: r.type, title: r.title, island: r.island,
  neighborhood: r.neighborhood, address: r.address, price: Number(r.price),
  oldPrice: Number(r.old_price ?? 0), hoa: Number(r.hoa),
  beds: r.beds, baths: Number(r.baths), sqft: r.sqft, lotAcres: Number(r.lot_acres), year: r.year,
  oceanfront: r.oceanfront, titled: r.titled, ownerFinancing: r.owner_financing,
  lat: r.lat, lng: r.lng, agentId: r.agent_id, agencyId: r.agency_id,
  featured: r.featured, featuredRank: r.featured_rank ?? 0, active: r.active, views: r.views,
  createdAt: r.created_at, tags: r.tags ?? [], photos: r.photos ?? [], text: r.body ?? '',
  sourceName: r.source_name ?? '', sourceRef: r.source_ref ?? '', sourceUrl: r.source_url ?? '',
  land: mapLand(r.land_facts),
  // до міграції 0028 колонки немає — тоді просто порожньо
  nearby: cleanNearby(r.nearby),
  developmentId: r.development_id ?? null,
  development: r.development ? { name: r.development.name, slug: r.development.slug } : null,
  buildingId: r.building_id ?? null,
  unitNo: r.unit_no ?? '',
  floor: r.floor ?? null,
  status: cleanStatus(r.status),
  // до міграції 0036 колонок немає — характеристик нема, «оновлено» = дата публікації
  details: cleanDetails(r.details),
  updatedAt: r.updated_at ?? r.created_at,
  floorplan: r.floorplan ?? '',
  // до міграції 0048 колонки немає — фототуру нема, лишається звичайна галерея
  photoRooms: cleanPhotoRooms(r.photo_rooms, r.photos ?? []),
  // до міграції 0049 модерації й строку немає — усе опубліковано й безстрокове
  review: REVIEWS.includes(r.review) ? r.review : 'approved',
  reviewNote: r.review_note ?? '',
  duplicateOf: r.duplicate_of ?? null,
  expiresAt: r.expires_at ?? null,
});
const REVIEWS: ListingReview[] = ['draft', 'pending', 'approved', 'rejected'];

/** Паспорт ділянки їде разом з оголошенням; !inner — коли фільтруємо за готовністю. */
const LAND_EMBED = '*, checker:profiles!land_facts_checked_by_fkey(name)';
const listingCols = (q: ListingQuery, base = '*') =>
  `${base}, land_facts${q.ready ? '!inner' : ''}(${LAND_EMBED}), development:developments(name, slug)`;

const mapLead = (r: Row): Lead => ({
  id: r.id, listingId: r.listing_id, agentId: r.agent_id, agencyId: r.agency_id,
  userId: r.user_id ?? null, name: r.name, phone: r.phone, email: r.email ?? '',
  message: r.message, createdAt: r.created_at,
  // до міграції 0053 у базі new/done — done показуємо як «Contacted»
  status: r.status === 'done' ? 'contacted' : r.status, lostReason: r.lost_reason ?? '',
  channel: r.channel === 'whatsapp' || r.channel === 'visit' ? r.channel : 'form',
  // до міграції 0047 колонок немає
  visitAt: r.visit_at ?? null, interests: r.interests ?? [], contactVia: r.contact_via ?? '',
  listingTitle: r.listing?.title ?? '', agentName: r.agent?.name ?? '',
  developmentName: r.listing?.development?.name ?? '', developmentSlug: r.listing?.development?.slug ?? '',
  source: r.source ?? '',   // до міграції 0056 колонки немає
});

/**
 * Публічний набір колонок профілю: без email (це логін) і без is_admin.
 * Анонімна роль у базі й не має права їх читати — тому «*» тут зламався б.
 */
const AGENT_PUBLIC_COLS = 'id, role, name, avatar, phone, whatsapp, agency_id, is_owner, '
  + 'experience, rating, reviews, verified, languages, about, active, created_at, '
  + 'agency:agencies!profiles_agency_id_fkey(name)';

/** Повний профіль — лише для залогінених контекстів: свій кабінет, команда, адмінка. */
const AGENT_FULL_COLS = '*, agency:agencies!profiles_agency_id_fkey(name)';

/** Картка агенції без invite_code: код читає лише власник через RPC. */
export const AGENCY_PUBLIC_COLS = 'id, name, brand, phone, email, about, verified, owner_id, created_at';

/* ---------- profiles / agents ---------- */
export async function getAgent(id: string): Promise<Agent | null> {
  const client = await db();
  const full = await client.from('profiles').select(`${AGENT_PUBLIC_COLS}, viber, telegram`).eq('id', id).maybeSingle();
  // до міграції 0034 колонок viber/telegram немає — тоді беремо профіль без них
  const { data } = full.error
    ? await client.from('profiles').select(AGENT_PUBLIC_COLS).eq('id', id).maybeSingle()
    : full;
  return data ? mapAgent(data) : null;
}

export async function listAgents(): Promise<Agent[]> {
  const { data } = await (await db()).from('profiles').select(AGENT_PUBLIC_COLS).eq('role', 'agent').order('reviews', { ascending: false });
  return (data ?? []).map(mapAgent);
}

/** withContacts=true — для команди в кабінеті, де показуємо пошту колег. */
export async function agencyMembers(agencyId: string, withContacts = false): Promise<Agent[]> {
  const client = await db();
  const cols = withContacts ? AGENT_FULL_COLS : AGENT_PUBLIC_COLS;
  // склад команди — з agency_members: людина може бути в кількох командах, а profiles.agency_id — лише активна
  const { data, error } = await client.from('agency_members')
    .select(`is_owner, profile:profiles!agency_members_profile_id_fkey(${cols})`).eq('agency_id', agencyId)
    .order('joined_at');
  if (!error) {
    return (data ?? [])
      .filter((m: Row) => m.profile && m.profile.role === 'agent')
      .map((m: Row) => ({ ...mapAgent(m.profile), isOwner: m.is_owner }));
  }
  // до міграції 0040 таблиці немає — беремо по активній агенції
  const { data: legacy } = await client.from('profiles').select(cols)
    .eq('agency_id', agencyId).eq('role', 'agent');
  return (legacy ?? []).map(mapAgent);
}

export type TeamMembership = { agency: Agency; isOwner: boolean; active: boolean };

/** Усі команди людини; активна — та, що в profiles.agency_id. */
export async function myTeams(user: Agent): Promise<TeamMembership[]> {
  const { data, error } = await (await db()).from('agency_members')
    .select(`is_owner, agency:agencies(${AGENCY_PUBLIC_COLS})`).eq('profile_id', user.id).order('joined_at');
  if (error) {
    const agency = await getAgency(user.agencyId);
    return agency ? [{ agency, isOwner: user.isOwner, active: true }] : [];
  }
  return (data ?? []).filter((m: Row) => m.agency).map((m: Row) => ({
    agency: mapAgency(m.agency), isOwner: m.is_owner, active: m.agency.id === user.agencyId,
  }));
}

/* ---------- agencies ---------- */
export async function getAgency(id: string | null): Promise<Agency | null> {
  if (!id) return null;
  const { data } = await (await db()).from('agencies').select(AGENCY_PUBLIC_COLS).eq('id', id).maybeSingle();
  return data ? mapAgency(data) : null;
}

export async function agencyBoard() {
  const { data } = await (await db())
    .from('agency_board').select('*').order('listings_count', { ascending: false });
  const rows = (data ?? []).map((r: Row) => ({
    agency: mapAgency(r),
    listings: Number(r.listings_count),
    agents: Number(r.agents_count),
  }));
  // просунуті агенції (міграція 0046) — першими, у порядку черги Featured
  return rows.sort((a, b) => Number(b.agency.featured) - Number(a.agency.featured)
    || (a.agency.featured ? (a.agency.featuredRank ?? 0) - (b.agency.featuredRank ?? 0) : 0));
}

/* ---------- listings ---------- */
/** Спільні фільтри для вибірки та для лічильників — щоб критерії не розʼїхались. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(sel: any, q: ListingQuery) {
  // Кожна умова «одне з» — окрема група. PostgREST не поєднує кілька параметрів or=
  // через І, тож наприкінці збираємо їх в один: or=(and(or(…),or(…))).
  const anyOf: string[] = [];
  if (!q.includeInactive) sel = sel.eq('active', true);
  // продані й здані квартири лишаються на сторінці ЖК, але не в пошуку
  if (q.developmentId) sel = sel.eq('development_id', q.developmentId);
  else if (!q.includeInactive) sel = sel.in('status', OPEN_STATUSES);
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
  if (q.bbox) {
    const [south, west, north, east] = q.bbox;
    sel = sel.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east);
  }
  if (q.oceanfront) sel = sel.eq('oceanfront', true);
  if (q.titled) sel = sel.eq('titled', true);
  if (q.ownerFinancing) sel = sel.eq('owner_financing', true);
  if (q.tags?.length) sel = sel.contains('tags', q.tags);
  if (q.ready) sel = sel.eq('land_facts.ready', true);
  if (q.beds?.length) {
    // 4 у фільтрі означає «4+»
    anyOf.push(q.beds.map((b) => (b >= 4 ? 'beds.gte.4' : `beds.eq.${b}`)).join(','));
  }
  // характеристики живуть у details (міграція 0036)
  if (q.furnished) sel = sel.in('details->>furnished', ['furnished', 'partly']);
  if (q.pets) sel = sel.in('details->>pets', ['yes', 'ask']);
  if (q.parking) sel = sel.in('details->>parking', ['garage', 'covered', 'open', 'street']);
  if (q.ac) sel = sel.in('details->>ac', ['central', 'split', 'some']);
  if (q.build === 'new') anyOf.push('development_id.not.is.null,details->>condition.eq.new');
  if (q.build === 'resale') {
    sel = sel.is('development_id', null);
    anyOf.push('details->>condition.is.null,details->>condition.neq.new');
  }
  if (q.reduced) sel = sel.gt('old_price', 0);
  if (q.days) sel = sel.gte('created_at', new Date(Date.now() - q.days * 864e5).toISOString());
  // кожне слово має знайтись хоч десь; значення в or() беремо в лапки — інакше пробіли ламають розбір у PostgREST
  for (const w of q.terms ?? splitWords(q.q)) {
    const s = `"%${w}%"`;
    anyOf.push(`title.ilike.${s},address.ilike.${s},neighborhood.ilike.${s},island.ilike.${s},body.ilike.${s}`);
  }
  if (anyOf.length === 1) sel = sel.or(anyOf[0]);
  else if (anyOf.length > 1) sel = sel.or(`and(${anyOf.map((g) => `or(${g})`).join(',')})`);
  return sel;
}

const splitWords = (q?: string) =>
  (q ?? '').toLowerCase().replace(/["\\%_(),]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 8);

/**
 * Текст запиту → слова з виправленими опечатками (search_terms, міграція 0051).
 * До міграції функції немає — шукаємо слова як є.
 */
async function withTerms(q: ListingQuery): Promise<ListingQuery> {
  const words = splitWords(q.q);
  if (!words.length || q.terms) return q;
  const { data, error } = await (await db()).rpc('search_terms', { p_q: words.join(' ') });
  return { ...q, terms: !error && Array.isArray(data) && data.length ? splitWords((data as string[]).join(' ')) : words };
}

/**
 * Featured — це реклама: на публічних сторінках відмічене адміном завжди йде першим
 * (у порядку з вкладки Featured), а вже потім обране сортування. Кабінет і адмінка
 * (includeInactive) бачать чистий порядок — там людина керує своїм, а не дивиться вітрину.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(sel: any, sort: ListingQuery['sort'], promote = true) {
  if (promote) sel = sel.order('featured', { ascending: false }).order('featured_rank', { ascending: true });
  switch (sort) {
    case 'price_asc': return sel.order('price', { ascending: true });
    case 'price_desc': return sel.order('price', { ascending: false });
    case 'sqft_desc': return sel.order('sqft', { ascending: false });
    case 'popular': return sel.order('views', { ascending: false });
    // обчислювані колонки з міграції 0051; без площі чи без знижки — в кінець
    case 'ppsf_asc': return sel.order('price_per_sqft', { ascending: true, nullsFirst: false });
    case 'reduced': return sel.order('price_cut_pct', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    default: return sel.order('created_at', { ascending: false });
  }
}

export const PAGE_SIZE = 24;

/** Сторінка результатів + скільки всього збігів (для «показати ще» і лічильника). */
export async function searchListings(query: ListingQuery = {}, page = 0, pageSize = PAGE_SIZE) {
  const q = await withTerms(query);
  const from = page * pageSize;
  const run = async (sort: ListingQuery['sort']) => applySort(
    applyFilters((await db()).from('listings').select(listingCols(q), { count: 'exact' }), q), sort, !q.includeInactive,
  ).range(from, from + pageSize - 1);

  let { data, error, count } = await run(q.sort);
  // до міграції 0051 колонок для «за ft²» і «подешевшали» немає — тоді звичайний порядок
  if (error && NEW_SORTS.includes(q.sort ?? '') && (error.code === '42703' || /price_per_sqft|price_cut_pct/.test(error.message))) {
    ({ data, error, count } = await run(undefined));
  }
  if (error) throw error;
  const items = (data ?? []).map(mapListing);
  return { items, total: count ?? items.length, hasMore: from + items.length < (count ?? 0) };
}

/** Координати всіх збігів — щоб карта показувала повну картину, а список вантажився сторінками. */
const NEW_SORTS = ['ppsf_asc', 'reduced'];

export async function queryPins(query: ListingQuery = {}) {
  const q = await withTerms(query);
  const pins = q.ready ? 'id, lat, lng, price, deal, land_facts!inner(ready)' : 'id, lat, lng, price, deal';
  const sel = applyFilters((await db()).from('listings').select(pins), q);
  const { data, error } = await sel.limit(2000);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ id: r.id, lat: r.lat, lng: r.lng, price: Number(r.price), deal: r.deal }));
}

export async function queryListings(query: ListingQuery = {}): Promise<Listing[]> {
  const q = await withTerms(query);
  let sel = applyFilters((await db()).from('listings').select(listingCols(q)), q);
  sel = applySort(sel, q.sort, !q.includeInactive);

  const { data, error } = await sel.limit(500);
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  const { data } = await (await db()).from('listings').select(listingCols({})).eq('id', id).maybeSingle();
  return data ? mapListing(data) : null;
}

/**
 * До міграцій 0036, 0048 і 0049 колонок details, photo_rooms, review і expires_at немає:
 * PostgREST відповідає PGRST204 — тоді зберігаємо без них.
 */
const OPTIONAL_COLUMNS = ['details', 'photo_rooms', 'review', 'expires_at'];
const missingDetails = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === 'PGRST204' || e.code === '42703') && /details|photo_rooms|review|expires_at/.test(e.message ?? ''));
const dropOptional = (row: Row) => { for (const c of OPTIONAL_COLUMNS) delete row[c]; };

export async function createListing(input: Partial<Listing> & { agentId: string; agencyId: string | null; externalId?: string }) {
  const client = await db();
  const row: Row = {
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
    source_name: input.sourceName ?? '',
    source_ref: input.sourceRef ?? '',
    source_url: safeUrl(input.sourceUrl),
    ...(input.nearby?.length ? { nearby: cleanNearby(input.nearby) } : {}),
    ...(Object.keys(cleanDetails(input.details)).length ? { details: cleanDetails(input.details) } : {}),
    ...(Object.keys(cleanPhotoRooms(input.photoRooms, input.photos ?? [])).length
      ? { photo_rooms: cleanPhotoRooms(input.photoRooms, input.photos ?? []) } : {}),
    development_id: input.developmentId || null,
    ...(input.buildingId ? { building_id: input.buildingId } : {}),
    ...(input.floorplan ? { floorplan: safePlan(input.floorplan) } : {}),
    unit_no: String(input.unitNo ?? '').trim().slice(0, 20),
    floor: intOrNull(input.floor),
    status: cleanStatus(input.status),
    // чернетку видно лише автору; інакше статус модерації ставить тригер listings_review
    ...(input.review === 'draft' ? { review: 'draft' } : {}),
    // код обʼєкта в системі агенції — лише з імпорту (міграція 0054)
    ...(input.externalId ? { external_id: input.externalId.slice(0, 120) } : {}),
  };
  let res = await client.from('listings').insert(row).select(listingCols({})).single();
  if (missingDetails(res.error)) {
    dropOptional(row);
    res = await client.from('listings').insert(row).select(listingCols({})).single();
  }
  const { data, error } = res;
  if (error) throw error;
  return mapListing(data);
}

const LAND_COLUMNS: Record<string, string> = {
  titleStatus: 'title_status', survey: 'survey', roadAccess: 'road_access', power: 'power',
  water: 'water', zolitur: 'zolitur', zone: 'zone', slope: 'slope',
  view: 'sea_view', beach: 'beach', internet: 'internet', flood: 'flood',
};

/** Паспорт ділянки: upsert за listing_id. Права — ті самі, що на саме оголошення (RLS land_facts). */
export async function saveLandFacts(listingId: string, patch: Record<string, unknown>) {
  const row: Row = { listing_id: listingId };
  for (const [key, column] of Object.entries(LAND_COLUMNS)) {
    const v = patch[key];
    if (typeof v === 'string' && v) row[column] = v;
  }
  const { error } = await (await db()).from('land_facts').upsert(row, { onConflict: 'listing_id' });
  if (error) throw error;
}

/** Мапа «поле форми → колонка», щоб редагування покривало всі поля оголошення. */
const LISTING_COLUMNS: Record<string, string> = {
  deal: 'deal', type: 'type', title: 'title', island: 'island', neighborhood: 'neighborhood',
  address: 'address', price: 'price', hoa: 'hoa', beds: 'beds', baths: 'baths', sqft: 'sqft',
  lotAcres: 'lot_acres', year: 'year', oceanfront: 'oceanfront', titled: 'titled',
  ownerFinancing: 'owner_financing', lat: 'lat', lng: 'lng', tags: 'tags', photos: 'photos',
  text: 'body', active: 'active',
  sourceName: 'source_name', sourceRef: 'source_ref', sourceUrl: 'source_url',
  nearby: 'nearby', details: 'details', photoRooms: 'photo_rooms',
  developmentId: 'development_id', buildingId: 'building_id', unitNo: 'unit_no', floor: 'floor', status: 'status',
  floorplan: 'floorplan',
  // «на перевірку» / «в чернетку» і продовження строку; що з цього дозволено, вирішує тригер
  review: 'review', expiresAt: 'expires_at',
};
const NUMERIC = new Set(['price', 'hoa', 'beds', 'baths', 'sqft', 'lotAcres', 'year', 'lat', 'lng']);
const BOOLEAN = new Set(['oceanfront', 'titled', 'ownerFinancing', 'active']);

export async function updateListing(id: string, patch: Partial<Listing>) {
  const row: Row = {};
  for (const [key, column] of Object.entries(LISTING_COLUMNS)) {
    const value = (patch as Row)[key];
    if (value === undefined) continue;
    row[column] = key === 'sourceUrl' ? safeUrl(value)
      : key === 'floorplan' ? safePlan(value)
      : key === 'nearby' ? cleanNearby(value)
      : key === 'details' ? cleanDetails(value)
      : key === 'photoRooms' ? cleanPhotoRooms(value, Array.isArray(patch.photos) ? patch.photos : undefined)
      : key === 'developmentId' || key === 'buildingId' ? value || null
      : key === 'unitNo' ? String(value).trim().slice(0, 20)
      : key === 'floor' ? intOrNull(value)
      : key === 'status' ? cleanStatus(value)
      : key === 'review' ? (value === 'draft' ? 'draft' : 'pending')
      : key === 'expiresAt' ? (Number.isNaN(Date.parse(String(value))) ? undefined : new Date(String(value)).toISOString())
      : NUMERIC.has(key) ? Number(value) || 0
        : BOOLEAN.has(key) ? Boolean(value) : value;
  }
  if (!Object.keys(row).length) return getListing(id);

  const client = await db();
  let res = await client.from('listings').update(row).eq('id', id).select(listingCols({})).maybeSingle();
  if (missingDetails(res.error) && OPTIONAL_COLUMNS.some((c) => c in row)) {
    dropOptional(row);
    res = Object.keys(row).length
      ? await client.from('listings').update(row).eq('id', id).select(listingCols({})).maybeSingle()
      : await client.from('listings').select(listingCols({})).eq('id', id).maybeSingle();
  }
  const { data, error } = res;
  if (error) throw error;
  return data ? mapListing(data) : null;
}

/** Усі зміни ціни, від найстарішої. До міграції 0036 таблиці немає — тоді порожньо. */
export async function getPriceHistory(listingId: string): Promise<PricePoint[]> {
  const { data, error } = await (await db()).from('listing_prices')
    .select('price, deal, changed_at').eq('listing_id', listingId).order('changed_at').limit(200);
  if (error) return [];
  return (data ?? []).map((r: Row) => ({ price: Number(r.price), deal: r.deal, at: r.changed_at }));
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

/**
 * Той самий лічильник, але поза критичним шляхом рендера.
 * Клієнт створюємо ДО after(): усередині колбека cookies() заборонені, і спроба
 * зробити це там валила рендер сторінки — разом із нею вмирала вся інтерактивність.
 */
export async function bumpViewsAfterResponse(id: string) {
  const client = await db();
  after(async () => {
    const { error } = await client.rpc('bump_views', { p_listing: id });
    if (error) console.error('bump_views failed:', error.message);
  });
}

/* ---------- developments (ЖК) ---------- */
const mapDevelopment = (r: Row): Development => ({
  id: r.id, slug: r.slug, name: r.name, developer: r.developer ?? '', developerId: r.developer_id ?? null,
  completion: r.completion ?? '',
  sales: cleanSales(r.sales), website: r.website ?? '', island: r.island, neighborhood: r.neighborhood,
  address: r.address ?? '', lat: r.lat, lng: r.lng, photos: r.photos ?? [], text: r.body ?? '',
  floors: r.floors ?? null, construction: r.construction ?? '', parking: r.parking ?? '', amenities: r.amenities ?? [],
  hoa: r.hoa ?? null, rentals: cleanRentals(r.rentals), payment: r.payment ?? '',
  projectClass: r.project_class ?? '', walls: r.walls ?? '', insulation: r.insulation ?? '', climate: r.climate ?? '',
  ceiling: r.ceiling ?? '', finish: r.finish ?? '', territory: r.territory ?? '', backupPower: r.backup_power ?? '',
  water: r.water ?? '', video: r.video ?? '', tour: r.tour ?? '', office: r.office ?? '', hours: r.hours ?? '',
  schedule: cleanSchedule(r.schedule),
  // до міграції 0055 колонок немає
  visitCapacity: r.visit_capacity ?? 1, blackoutDates: r.blackout_dates ?? [],
  agentId: r.agent_id, agencyId: r.agency_id, active: r.active, createdAt: r.created_at,
  // до міграції 0044 колонок немає
  featured: r.featured ?? false, featuredRank: r.featured_rank ?? 0,
});

export async function getDevelopment(slugOrId: string): Promise<Development | null> {
  const isId = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const { data } = await (await db()).from('developments').select('*').eq(isId ? 'id' : 'slug', slugOrId).maybeSingle();
  return data ? mapDevelopment(data) : null;
}

/** agentId — свої ЖК у кабінеті (разом із прихованими); без нього — публічний список */
export async function listDevelopments(opts: { agentId?: string; agencyId?: string; developerId?: string } = {}): Promise<Development[]> {
  let sel = (await db()).from('developments').select('*');
  const own = !opts.developerId && Boolean(opts.agencyId || opts.agentId);
  // публічно відмічені адміном ЖК ідуть першими, як і оголошення (див. applySort)
  if (!own) sel = sel.order('featured', { ascending: false }).order('featured_rank', { ascending: true });
  sel = sel.order('created_at', { ascending: false });
  if (opts.developerId) sel = sel.eq('developer_id', opts.developerId).eq('active', true);
  else if (opts.agencyId) sel = sel.eq('agency_id', opts.agencyId);
  else if (opts.agentId) sel = sel.eq('agent_id', opts.agentId);
  else sel = sel.eq('active', true);
  const { data, error } = await sel.limit(200);
  if (error) throw error;
  return (data ?? []).map(mapDevelopment);
}

const DEVELOPMENT_TEXT = ['name', 'developer', 'completion', 'island', 'neighborhood', 'address', 'construction', 'parking'] as const;

const DEVELOPMENT_SPECS = [
  ['projectClass', 'project_class'], ['walls', 'walls'], ['insulation', 'insulation'], ['climate', 'climate'],
  ['ceiling', 'ceiling'], ['finish', 'finish'], ['territory', 'territory'], ['backupPower', 'backup_power'], ['water', 'water'],
] as const;

/** Те, що прийшло з форми, — у рядок таблиці. Порожні поля не чіпаємо (для PATCH). */
function developmentRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  for (const k of DEVELOPMENT_TEXT) if (typeof input[k] === 'string') row[k] = (input[k] as string).trim().slice(0, 120);
  if (input.text !== undefined) row.body = String(input.text).slice(0, 8000);
  if (input.website !== undefined) {
    const w = String(input.website).trim();
    row.website = safeUrl(w) || (w && !/^[a-z]+:/i.test(w) ? safeUrl(`https://${w}`) : '');
  }
  if (input.sales !== undefined) row.sales = cleanSales(input.sales);
  // профіль забудовника; без нього назва лишається вільним текстом
  if (input.developerId !== undefined) {
    const id = String(input.developerId ?? '');
    row.developer_id = /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }
  if (typeof input.office === 'string') row.office = input.office.trim().slice(0, 160);
  if (typeof input.hours === 'string') row.hours = input.hours.trim().slice(0, 200);
  if (input.schedule !== undefined) row.schedule = cleanSchedule(input.schedule);
  for (const k of ['video', 'tour'] as const) if (input[k] !== undefined) row[k] = safeUrl(String(input[k] ?? '').trim()).slice(0, 500);
  for (const [k, col] of DEVELOPMENT_SPECS) if (typeof input[k] === 'string') row[col] = (input[k] as string).trim().slice(0, 120);
  if (input.rentals !== undefined) row.rentals = cleanRentals(input.rentals);
  if (input.payment !== undefined) row.payment = String(input.payment).trim().slice(0, 2000);
  if (input.amenities !== undefined) row.amenities = splitList(input.amenities);
  if (input.floors !== undefined) row.floors = intOrNull(input.floors);
  if (input.hoa !== undefined) row.hoa = intOrNull(input.hoa);
  if (input.lat !== undefined) row.lat = Number(input.lat) || 16.3;
  if (input.lng !== undefined) row.lng = Number(input.lng) || -86.59;
  if (Array.isArray(input.photos)) row.photos = input.photos.filter((p) => typeof p === 'string').slice(0, 30);
  if (input.active !== undefined) row.active = Boolean(input.active);
  return row;
}

export async function createDevelopment(input: Record<string, unknown> & { agentId: string }) {
  const row = developmentRow(input);
  const base = slugify(String(input.slug || row.name || '')) || 'development';
  const client = await db();
  // адреса має бути унікальною: duna-tower, duna-tower-2…
  const { data: taken } = await client.from('developments').select('slug').like('slug', `${base}%`);
  const used = new Set((taken ?? []).map((r: Row) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { data, error } = await client.from('developments')
    .insert({ ...row, slug, agent_id: input.agentId }).select('*').single();
  if (error) throw error;
  return mapDevelopment(data);
}

export async function updateDevelopment(id: string, input: Record<string, unknown>) {
  const row = developmentRow(input);
  if (!Object.keys(row).length) return getDevelopment(id);
  const client = await db();
  let { data, error } = await client.from('developments').update(row).eq('id', id).select('*').maybeSingle();
  // до міграції 0047 колонки графіка немає — зберігаємо решту
  if (error && 'schedule' in row && /schedule/.test(error.message ?? '')) {
    delete row.schedule;
    ({ data, error } = await client.from('developments').update(row).eq('id', id).select('*').maybeSingle());
  }
  if (error) throw error;
  return data ? mapDevelopment(data) : null;
}

export async function deleteDevelopment(id: string) {
  const { error, count } = await (await db()).from('developments').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---------- developers (забудовники) ---------- */
const mapDeveloper = (r: Row): Developer => ({
  id: r.id, slug: r.slug, name: r.name, logo: r.logo ?? '', about: r.about ?? '', website: r.website ?? '',
  phone: r.phone ?? '', email: r.email ?? '', founded: r.founded ?? null, ownerId: r.owner_id ?? null,
  verified: !!r.verified, createdAt: r.created_at,
});

/** До міграції 0042 таблиці немає — тоді список просто порожній */
export async function listDevelopers(opts: { ownerId?: string } = {}): Promise<Developer[]> {
  let sel = (await db()).from('developers').select('*').order('name');
  if (opts.ownerId) sel = sel.eq('owner_id', opts.ownerId);
  const { data, error } = await sel.limit(500);
  if (error) return [];
  return (data ?? []).map(mapDeveloper);
}

export async function getDeveloper(slugOrId: string): Promise<Developer | null> {
  const isId = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const { data } = await (await db()).from('developers').select('*').eq(isId ? 'id' : 'slug', slugOrId).maybeSingle();
  return data ? mapDeveloper(data) : null;
}

function developerRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  if (typeof input.name === 'string') row.name = input.name.trim().slice(0, 120);
  if (typeof input.about === 'string') row.about = input.about.trim().slice(0, 4000);
  if (typeof input.phone === 'string') row.phone = input.phone.trim().slice(0, 40);
  if (typeof input.email === 'string') row.email = input.email.trim().slice(0, 120);
  if (input.logo !== undefined) row.logo = String(input.logo ?? '').trim().slice(0, 500);
  if (input.website !== undefined) {
    const w = String(input.website).trim();
    row.website = safeUrl(w) || (w && !/^[a-z]+:/i.test(w) ? safeUrl(`https://${w}`) : '');
  }
  if (input.founded !== undefined) {
    const y = intOrNull(input.founded);
    row.founded = y && y >= 1900 && y <= 2100 ? y : null;
  }
  return row;
}

export async function createDeveloper(input: Record<string, unknown> & { ownerId: string }) {
  const row = developerRow(input);
  const base = slugify(String(row.name || '')) || 'developer';
  const client = await db();
  const { data: taken } = await client.from('developers').select('slug').like('slug', `${base}%`);
  const used = new Set((taken ?? []).map((r: Row) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { data, error } = await client.from('developers')
    .insert({ ...row, slug, owner_id: input.ownerId }).select('*').single();
  if (error) throw error;
  return mapDeveloper(data);
}

/** Права задає RLS: власник профілю або адмін */
export async function updateDeveloper(id: string, input: Record<string, unknown>) {
  const row = developerRow(input);
  if (row.name === '') delete row.name;
  if (!Object.keys(row).length) return getDeveloper(id);
  const { data, error } = await (await db()).from('developers').update(row).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapDeveloper(data) : null;
}

export async function deleteDeveloper(id: string) {
  const { error, count } = await (await db()).from('developers').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---------- buildings (доми в ЖК) ---------- */
const mapBuilding = (r: Row): Building => ({
  id: r.id, developmentId: r.development_id, name: r.name, photo: r.photo ?? '', floors: r.floors ?? null,
  stage: cleanStage(r.stage), completion: r.completion ?? '', address: r.address ?? '', sort: r.sort ?? 0,
  featured: r.featured ?? false, featuredRank: r.featured_rank ?? 0,
});

/** До міграції 0035 таблиці немає — тоді ЖК просто без домів */
export async function listBuildings(developmentId: string): Promise<Building[]> {
  const { data, error } = await (await db()).from('buildings').select('*')
    .eq('development_id', developmentId).order('sort').order('created_at');
  if (error) return [];
  return (data ?? []).map(mapBuilding);
}

export async function getBuilding(id: string): Promise<Building | null> {
  const { data } = await (await db()).from('buildings').select('*').eq('id', id).maybeSingle();
  return data ? mapBuilding(data) : null;
}

function buildingRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  if (typeof input.name === 'string') row.name = input.name.trim().slice(0, 60);
  if (typeof input.completion === 'string') row.completion = input.completion.trim().slice(0, 40);
  if (typeof input.address === 'string') row.address = input.address.trim().slice(0, 120);
  if (input.photo !== undefined) row.photo = safeUrl(String(input.photo ?? ''));
  if (input.floors !== undefined) row.floors = intOrNull(input.floors);
  if (input.sort !== undefined) row.sort = intOrNull(input.sort) ?? 0;
  if (input.stage !== undefined) row.stage = cleanStage(input.stage);
  return row;
}

export async function createBuilding(developmentId: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('buildings')
    .insert({ ...buildingRow(input), development_id: developmentId }).select('*').single();
  if (error) throw error;
  return mapBuilding(data);
}

export async function updateBuilding(id: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('buildings').update(buildingRow(input)).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapBuilding(data) : null;
}

/** Квартири дому лишаються в ЖК — посилання на дім просто обнуляється */
export async function deleteBuilding(id: string) {
  const { error, count } = await (await db()).from('buildings').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---------- документи ЖК ---------- */
const mapDocument = (r: Row): DevelopmentDocument => ({
  id: r.id, developmentId: r.development_id, listingId: r.listing_id ?? null, kind: cleanDocKind(r.kind), title: r.title, number: r.number ?? '',
  issued: r.issued ?? '', file: r.file ?? '', note: r.note ?? '', verified: !!r.verified, sort: r.sort ?? 0,
});

/**
 * Документи ЖК. За замовчуванням — лише спільні для всього ЖК; `withUnits` додає документи
 * окремих квартир (для редактора). До міграції 0038 таблиці немає — тоді ЖК просто без документів.
 */
export async function listDocuments(developmentId: string, withUnits = false): Promise<DevelopmentDocument[]> {
  const { data, error } = await (await db()).from('development_documents').select('*')
    .eq('development_id', developmentId).order('sort').order('created_at');
  if (error) return [];
  return (data ?? []).map(mapDocument).filter((d) => withUnits || !d.listingId);
}

/** Документи однієї квартири (план юніта тощо); до міграції 0041 колонки немає — порожньо */
export async function listUnitDocuments(listingId: string): Promise<DevelopmentDocument[]> {
  const { data, error } = await (await db()).from('development_documents').select('*')
    .eq('listing_id', listingId).order('sort').order('created_at');
  if (error) return [];
  return (data ?? []).map(mapDocument);
}

function documentRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  if (typeof input.title === 'string') row.title = input.title.trim().slice(0, 120);
  if (typeof input.number === 'string') row.number = input.number.trim().slice(0, 60);
  if (typeof input.issued === 'string') row.issued = input.issued.trim().slice(0, 40);
  if (typeof input.note === 'string') row.note = input.note.trim().slice(0, 300);
  if (input.file !== undefined) row.file = safeUrl(String(input.file ?? '')).slice(0, 500);
  if (input.kind !== undefined) row.kind = cleanDocKind(input.kind);
  if (input.sort !== undefined) row.sort = intOrNull(input.sort) ?? 0;
  // для не-адміна тригер у базі все одно залишить старе значення
  if (input.verified !== undefined) row.verified = input.verified === true || input.verified === 'on';
  return row;
}

export async function createDocument(developmentId: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_documents')
    .insert({ ...documentRow(input), development_id: developmentId }).select('*').single();
  if (error) throw error;
  return mapDocument(data);
}

export async function updateDocument(id: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_documents').update(documentRow(input)).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapDocument(data) : null;
}

export async function deleteDocument(id: string) {
  const { error, count } = await (await db()).from('development_documents').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---------- хід будівництва ---------- */
const mapProgress = (r: Row): ProgressEntry => ({
  id: r.id, developmentId: r.development_id, buildingId: r.building_id ?? null,
  month: r.month, photos: r.photos ?? [], note: r.note ?? '',
});

/** До міграції 0039 таблиці немає — тоді просто без фото будівництва */
export async function listProgress(developmentId: string): Promise<ProgressEntry[]> {
  const { data, error } = await (await db()).from('development_progress').select('*')
    .eq('development_id', developmentId).order('month', { ascending: false }).order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapProgress);
}

/** «2026-06» або «2026-06-15» → перше число місяця */
const monthStart = (v: unknown) => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})/);
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${m[2]}-01` : null;
};

function progressRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  if (input.month !== undefined) {
    const m = monthStart(input.month);
    if (!m) throw new Error('Pick the month');
    row.month = m;
  }
  if (input.buildingId !== undefined) row.building_id = input.buildingId || null;
  if (Array.isArray(input.photos)) row.photos = input.photos.map((p) => safeUrl(p)).filter(Boolean).slice(0, 40);
  if (typeof input.note === 'string') row.note = input.note.trim().slice(0, 500);
  return row;
}

export async function createProgress(developmentId: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_progress')
    .insert({ ...progressRow(input), development_id: developmentId }).select('*').single();
  if (error) throw error;
  return mapProgress(data);
}

export async function updateProgress(id: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_progress').update(progressRow(input)).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapProgress(data) : null;
}

export async function deleteProgress(id: string) {
  const { error, count } = await (await db()).from('development_progress').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---------- новини ЖК ---------- */
const mapNews = (r: Row): DevelopmentNews => ({
  id: r.id, developmentId: r.development_id, title: r.title, body: r.body ?? '',
  photo: r.photo ?? '', publishedOn: r.published_on,
});

/** До міграції 0039 таблиці немає — тоді без новин */
export async function listNews(developmentId: string): Promise<DevelopmentNews[]> {
  const { data, error } = await (await db()).from('development_news').select('*')
    .eq('development_id', developmentId).order('published_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapNews);
}

function newsRow(input: Record<string, unknown>): Row {
  const row: Row = {};
  if (typeof input.title === 'string') row.title = input.title.trim().slice(0, 160);
  if (typeof input.body === 'string') row.body = input.body.trim().slice(0, 4000);
  if (input.photo !== undefined) row.photo = safeUrl(String(input.photo ?? ''));
  if (typeof input.publishedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn)) row.published_on = input.publishedOn;
  return row;
}

export async function createNews(developmentId: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_news')
    .insert({ ...newsRow(input), development_id: developmentId }).select('*').single();
  if (error) throw error;
  return mapNews(data);
}

export async function updateNews(id: string, input: Record<string, unknown>) {
  const { data, error } = await (await db()).from('development_news').update(newsRow(input)).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapNews(data) : null;
}

export async function deleteNews(id: string) {
  const { error, count } = await (await db()).from('development_news').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
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
    .select('*, listing:listings(title, development:developments(name, slug)), agent:profiles!leads_agent_id_fkey(name)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapLead);
}

export async function createLead(input: {
  listingId: string; name: string; phone: string; email?: string; message: string; userId?: string | null;
  channel?: 'form' | 'whatsapp' | 'visit';
  visitAt?: string; interests?: string[]; contactVia?: string;
  /** Візит текстом — для бази без міграції 0047, де дату й теми нікуди більше покласти */
  visitSummary?: string;
  /** 'widget' — заявка з віджета ЖК на чужому сайті (міграція 0056) */
  source?: string;
}): Promise<boolean> {
  const client = await db();
  const { data: listing } = await client.from('listings')
    .select('id, agent_id, agency_id').eq('id', input.listingId).maybeSingle();
  if (!listing) return false;

  // Без .select(): гість має право створити заявку, але не читати її — RLS поверне помилку на читанні
  const row = {
    listing_id: listing.id, agent_id: listing.agent_id, agency_id: listing.agency_id,
    user_id: input.userId ?? null,
    name: input.name, phone: input.phone, email: input.email ?? '', message: input.message,
    channel: input.channel ?? 'form',
  };
  const visit = input.channel === 'visit'
    ? { visit_at: input.visitAt, interests: input.interests ?? [], contact_via: input.contactVia ?? '' } : {};
  let { error } = await client.from('leads').insert({ ...row, ...visit, ...(input.source ? { source: input.source } : {}) });
  // до міграції 0056 колонки source немає — позначку джерела ставимо першим рядком повідомлення
  if (error && input.source && (error.code === 'PGRST204' || error.code === '42703' || /source/.test(error.message ?? ''))) {
    const message = `[${input.source === 'widget' ? 'Website widget' : input.source}]\n${input.message}`.slice(0, 2000);
    ({ error } = await client.from('leads').insert({ ...row, ...visit, message }));
  }
  // до міграції 0047 немає ні каналу «visit», ні його колонок — тоді звичайна заявка
  // з датою візиту й темами в тексті повідомлення
  if (error && input.channel === 'visit' && /visit_at|interests|contact_via|channel_check/.test(error.message ?? '')) {
    const message = [input.visitSummary, input.message].filter(Boolean).join('\n').slice(0, 2000);
    ({ error } = await client.from('leads').insert({ ...row, message, channel: 'form' }));
  }
  if (error) throw error;
  return true;
}

/** Лічильник запитів у базі: true — ще в межах ліміту. Див. lib/guard.ts. */
export async function rateLimitHit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await (await db()).rpc('rate_limit_hit', {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data !== false;
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

/** Код запрошення читає лише власник — і лише через RPC: у таблиці колонка закрита. */
export async function agencyInviteCode(): Promise<string | null> {
  const { data, error } = await (await db()).rpc('agency_invite_code');
  return error ? null : (data as string);
}

/* ---------- admin ---------- */
/** Зведення по платформі. RLS уже впустила лише адміна, окремих перевірок тут не треба. */
export async function adminOverview() {
  const client = await db();
  const count = async (table: string, filter?: (q: never) => unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = client.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = (filter as unknown as (x: unknown) => unknown)(q);
    const { count: n } = await q;
    return n ?? 0;
  };

  const [listings, hidden, agencies, reviews, leads, newLeads, pending, reports] = await Promise.all([
    count('listings'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count('listings', ((q: any) => q.eq('active', false)) as never),
    count('agencies'),
    count('reviews'),
    count('leads'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count('leads', ((q: any) => q.eq('status', 'new')) as never),
    // до міграції 0049 колонки й таблиці немає — запит падає, лічильник лишається нулем
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count('listings', ((q: any) => q.eq('review', 'pending')) as never),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count('listing_reports', ((q: any) => q.eq('status', 'open')) as never),
  ]);

  const { data: people } = await client.from('profiles').select('role, verified, is_admin, active');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (people ?? []) as any[];

  // Перевірки якості даних важать тут більше за загальні лічильники: оголошення
  // без фото чи земля з непідтвердженим титулом — це те, що псує довіру до площадки.
  const { data: qualityRows } = await client.from('listings')
    .select('views, photos, source_name, type, titled, body, lat, lng, land_facts(checked_at)');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = (qualityRows ?? []) as any[];
  const views = all.reduce((sum, r) => sum + (r.views ?? 0), 0);

  const checked = all.map((r) => ({
    photos: r.photos ?? [], sourceName: r.source_name ?? '', type: r.type, titled: r.titled,
    text: r.body ?? '', lat: r.lat, lng: r.lng,
    land: r.land_facts ? { checkedAt: r.land_facts.checked_at ?? null } : null,
  }));
  const quality = Object.fromEntries(
    QUALITY_CHECKS.map((c) => [c.key, checked.filter(c.test).length]),
  ) as Record<QualityKey, number>;

  return {
    listings, hidden, agencies, reviews, leads, newLeads, views, quality, pending, reports,
    agents: rows.filter((r) => r.role === 'agent').length,
    buyers: rows.filter((r) => r.role === 'user').length,
    unverifiedAgents: rows.filter((r) => r.role === 'agent' && !r.verified).length,
    suspended: rows.filter((r) => !r.active).length,
  };
}

export async function adminListUsers(): Promise<Agent[]> {
  const { data } = await (await db()).from('profiles')
    .select(AGENT_FULL_COLS).order('created_at', { ascending: false }).limit(500);
  return (data ?? []).map(mapAgent);
}

export async function adminListAgencies() {
  const client = await db();
  const [{ data: agencies }, { data: members }, { data: listings }] = await Promise.all([
    client.from('agencies').select(AGENCY_PUBLIC_COLS).order('created_at', { ascending: false }),
    client.from('agency_members').select('agency_id'),
    client.from('listings').select('agency_id'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countBy = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.agency_id === id).length;
  return (agencies ?? []).map((a) => ({
    agency: mapAgency(a),
    agents: countBy(members, a.id),
    listings: countBy(listings, a.id),
  }));
}

/** Оновлення полів, доступних лише адміну: підтвердження, добірка, блокування. */
export async function adminSetProfileFlags(id: string, patch: { verified?: boolean; active?: boolean; isAdmin?: boolean }) {
  const row: Row = {};
  if (patch.verified !== undefined) row.verified = patch.verified;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.isAdmin !== undefined) row.is_admin = patch.isAdmin;
  const { data, error } = await (await db()).from('profiles').update(row).eq('id', id).select(AGENT_FULL_COLS).maybeSingle();
  if (error) throw error;
  return data ? mapAgent(data) : null;
}

/** Правка чужого профілю адміном: контакти ріелтора, без прав і статусів. */
export async function adminUpdateProfile(id: string, patch: {
  name?: string; phone?: string; whatsapp?: string; about?: string; experience?: number; languages?: string[];
}) {
  const row: Row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.whatsapp !== undefined) row.whatsapp = patch.whatsapp;
  if (patch.about !== undefined) row.about = patch.about;
  if (patch.experience !== undefined) row.experience = patch.experience;
  if (patch.languages !== undefined) row.languages = patch.languages;
  if (!Object.keys(row).length) return null;
  const { data, error } = await (await db()).from('profiles').update(row).eq('id', id).select(AGENT_FULL_COLS).maybeSingle();
  if (error) throw error;
  return data ? mapAgent(data) : null;
}

/** На кого можна записати оголошення: усі ріелтори з назвою агенції. */
export async function adminListOwners(): Promise<{ id: string; name: string; agency: string }[]> {
  const { data } = await (await db()).from('profiles')
    .select('id, name, agency:agencies!profiles_agency_id_fkey(name)').eq('role', 'agent').order('name').limit(1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, agency: r.agency?.name ?? '' }));
}

export async function adminSetAgencyFlags(id: string, patch: { verified?: boolean }) {
  const { data, error } = await (await db()).from('agencies')
    .update({ verified: patch.verified }).eq('id', id).select(AGENCY_PUBLIC_COLS).maybeSingle();
  if (error) throw error;
  return data ? mapAgency(data) : null;
}

export async function adminSetListingFlags(id: string, patch: { featured?: boolean; active?: boolean }) {
  const row: Row = {};
  if (patch.featured !== undefined) row.featured = patch.featured;
  if (patch.active !== undefined) row.active = patch.active;
  const client = await db();
  const { data, error } = Object.keys(row).length
    ? await client.from('listings').update(row).eq('id', id).select(listingCols({})).maybeSingle()
    : await client.from('listings').select(listingCols({})).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapListing(data) : null;
}

/* ---------- Featured: ЖК, доми й оголошення на головній ---------- */
type FeaturedKind = 'listing' | 'development' | 'building';
const FEATURED_TABLE: Record<FeaturedKind, string> = { listing: 'listings', development: 'developments', building: 'buildings' };

/** Нове відмічене стає в кінець черги: адмін потім підніме стрілками, якщо треба. */
export async function adminSetFeatured(kind: FeaturedKind, id: string, featured: boolean) {
  const client = await db();
  const table = FEATURED_TABLE[kind];
  const row: Row = { featured };
  if (featured) {
    const { data: last, error } = await client.from(table).select('featured_rank')
      .eq('featured', true).order('featured_rank', { ascending: false }).limit(1).maybeSingle();
    // до міграції 0044 колонки немає — тоді лише сама пометка
    if (!error) row.featured_rank = (last?.featured_rank ?? 0) + 1;
  }
  const { error, count } = await client.from(table).update(row, { count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Новий порядок однієї групи: позиція в масиві = featured_rank. */
export async function adminReorderFeatured(kind: FeaturedKind, ids: string[]) {
  const client = await db();
  const table = FEATURED_TABLE[kind];
  const results = await Promise.all(ids.slice(0, 100).map((id, i) =>
    client.from(table).update({ featured_rank: i + 1 }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Усі ЖК з домами для адмінки — разом із прихованими (RLS пускає адміна). */
export async function adminListDevelopments(): Promise<(Development & { buildings: Building[]; units: number })[]> {
  const client = await db();
  const [devs, buildings, units] = await Promise.all([
    client.from('developments').select('*').order('created_at', { ascending: false }).limit(500),
    client.from('buildings').select('*').order('sort').order('created_at'),
    client.from('listings').select('development_id').not('development_id', 'is', null).limit(10000),
  ]);
  if (devs.error) throw devs.error;
  const byDev = new Map<string, Building[]>();
  (buildings.data ?? []).map(mapBuilding).forEach((b) => byDev.set(b.developmentId, [...(byDev.get(b.developmentId) ?? []), b]));
  const counts = new Map<string, number>();
  (units.data ?? []).forEach((u: Row) => counts.set(u.development_id, (counts.get(u.development_id) ?? 0) + 1));
  return (devs.data ?? []).map((r: Row) => {
    const d = mapDevelopment(r);
    return { ...d, buildings: byDev.get(d.id) ?? [], units: counts.get(d.id) ?? 0 };
  });
}

/** Відмічені доми для головної — з назвою й адресою їхнього ЖК. До міграції 0044 — порожньо. */
export async function listFeaturedBuildings(): Promise<(Building & { development: { slug: string; name: string; neighborhood: string; photo: string } })[]> {
  const { data, error } = await (await db()).from('buildings')
    .select('*, development:developments!inner(slug, name, neighborhood, photos, active)')
    .eq('featured', true).eq('development.active', true).order('featured_rank').limit(12);
  if (error) return [];
  return (data ?? []).map((r: Row) => ({
    ...mapBuilding(r),
    development: { slug: r.development.slug, name: r.development.name, neighborhood: r.development.neighborhood ?? '', photo: r.development.photos?.[0] ?? '' },
  }));
}

/* ---------- журнал дій адміністратора ---------- */
type AdminLogInput = {
  action: string;
  targetKind: 'listing' | 'profile' | 'agency' | 'review' | 'development' | 'building' | 'campaign' | 'report' | 'site';
  targetId: string | null;
  targetName?: string;
  reason?: string;
};

/** Запис у журнал. Ніколи не валить саму дію: лог важливий, але не важливіший за неї. */
export async function adminLog(actor: { id: string; name: string }, entry: AdminLogInput) {
  const { error } = await (await db()).from('admin_log').insert({
    actor_id: actor.id,
    actor_name: actor.name,
    action: entry.action,
    target_kind: entry.targetKind,
    target_id: entry.targetId,
    target_name: entry.targetName ?? '',
    reason: entry.reason ?? '',
  });
  if (error) console.error('admin_log write failed:', error.message);
}

export async function adminListLog(): Promise<AdminLogEntry[]> {
  const { data } = await (await db()).from('admin_log')
    .select('*').order('created_at', { ascending: false }).limit(300);
  return (data ?? []).map((r: Row) => ({
    id: r.id, actorName: r.actor_name, action: r.action, targetKind: r.target_kind,
    targetId: r.target_id, targetName: r.target_name, reason: r.reason, createdAt: r.created_at,
  }));
}

/**
 * Видалення оголошення разом із фотографіями: інакше файли лишаються в бакеті
 * назавжди (кілька таких сиріт там уже є від видалених акаунтів).
 */
export async function adminDeleteListing(id: string) {
  const client = await db();
  const listing = await getListing(id);

  const paths = (listing?.photos ?? [])
    .map((url) => url.split('/listing-photos/')[1])
    .filter((p): p is string => Boolean(p))
    .map((p) => decodeURIComponent(p.split('?')[0]));

  if (paths.length) {
    const { error } = await client.storage.from('listing-photos').remove(paths);
    if (error) console.error('storage cleanup failed:', error.message);
  }

  const { error, count } = await client.from('listings').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function adminDeleteReview(id: string) {
  const { error } = await (await db()).from('reviews').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function adminListReviews(): Promise<Review[]> {
  const { data } = await (await db()).from('reviews')
    .select('*, author:profiles!reviews_author_id_fkey(name, avatar), agent:profiles!reviews_agent_id_fkey(name)')
    .order('created_at', { ascending: false }).limit(200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, agentId: r.agent_id, authorId: r.author_id, rating: r.rating,
    body: r.body, createdAt: r.created_at,
    authorName: r.author?.name ?? 'Guest', authorAvatar: r.author?.avatar ?? '',
    agentName: r.agent?.name ?? '',
  }));
}

/* ---------- reviews ---------- */
/**
 * Відгук може лишити лише той, хто вже писав цьому ріелтору: те саме правило
 * стоїть у політиці reviews_write, а тут — щоб не показувати форму марно.
 */
export async function canReviewAgent(agentId: string, userId: string | null) {
  if (!userId || userId === agentId) return false;
  const { count } = await (await db()).from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId).eq('user_id', userId);
  return (count ?? 0) > 0;
}

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

/* ---------- analytics ---------- */
/** PostgREST віддає не більше 1000 рядків за раз — дочитуємо сторінками. */
async function readAll(build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>, cap = 50000) {
  const out: Row[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Сирі дані для вкладки «Аналітика»: події й заявки за два періоди (поточний і попередній —
 * для порівняння), оголошення, ЖК, команда й ринок. Рахує lib/analytics.ts.
 * RLS і тут вирішує, що видно: свої події — ріелтору, усієї агенції — власнику.
 */
export async function analyticsRaw(agentId: string, agencyId: string | null, scope: 'own' | 'agency', days: number) {
  const client = await db();
  const since = new Date(Date.now() - 2 * days * 86400000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- конструктор запиту PostgREST
  const byScope = (sel: any) =>
    scope === 'agency' && agencyId ? sel.eq('agency_id', agencyId) : sel.eq('agent_id', agentId);

  const [listings, events, leads, devs, members, market] = await Promise.all([
    scope === 'agency' && agencyId
      ? queryListings({ agencyId, includeInactive: true })
      : queryListings({ agentId, includeInactive: true }),
    readAll((a, b) => byScope(client.from('listing_events')
      .select('listing_id, development_id, agent_id, kind, source, device, visitor, created_at'))
      .gte('created_at', since).order('created_at').range(a, b)),
    readAll((a, b) => byScope(client.from('leads')
      .select('id, listing_id, agent_id, status, channel, created_at, handled_at'))
      .gte('created_at', since).order('created_at').range(a, b), 10000)
      // до міграції 0043 колонки handled_at немає — без неї, ніж без заявок
      .then((rows) => rows.length ? rows : readAll((a, b) => byScope(client.from('leads')
        .select('id, listing_id, agent_id, status, channel, created_at'))
        .gte('created_at', since).order('created_at').range(a, b), 10000)),
    byScope(client.from('developments').select('id, name, slug, agent_id')).then((r: { data: Row[] | null }) => (r.data ?? []) as Row[]),
    scope === 'agency' && agencyId ? agencyMembers(agencyId) : Promise.resolve([] as Agent[]),
    readAll((a, b) => client.from('listings').select('price, sqft, type, deal, neighborhood')
      .eq('active', true).gt('sqft', 0).gt('price', 0).range(a, b), 5000),
  ]);
  return { listings, events, leads, devs, members, market };
}

/**
 * Адмінська аналітика: те саме, що analyticsRaw, але по всій платформі,
 * плюс реєстрації, агенції та пошуки (search_events, міграція 0045).
 */
export async function adminAnalyticsRaw(days: number) {
  const client = await db();
  const since = new Date(Date.now() - 2 * days * 86400000).toISOString();
  const [listings, events, leads, devs, people, agencies, searches, market] = await Promise.all([
    queryListings({ includeInactive: true }),
    readAll((a, b) => client.from('listing_events')
      .select('listing_id, development_id, agent_id, agency_id, kind, source, device, visitor, created_at')
      .gte('created_at', since).order('created_at').range(a, b)),
    readAll((a, b) => client.from('leads')
      .select('id, listing_id, agent_id, agency_id, status, channel, created_at, handled_at')
      .gte('created_at', since).order('created_at').range(a, b), 20000),
    client.from('developments').select('id, name, slug, agent_id, agency_id').then((r: { data: Row[] | null }) => r.data ?? []),
    readAll((a, b) => client.from('profiles')
      .select('id, role, name, avatar, agency_id, verified, active, created_at').order('created_at').range(a, b), 20000),
    client.from('agencies').select('id, name, verified, created_at').then((r: { data: Row[] | null }) => r.data ?? []),
    readAll((a, b) => client.from('search_events')
      .select('deal, type, areas, price_min, price_max, beds, q, results, device, visitor, created_at')
      .gte('created_at', since).order('created_at').range(a, b)),
    readAll((a, b) => client.from('listings').select('price, sqft, type, deal, neighborhood')
      .eq('active', true).gt('sqft', 0).gt('price', 0).range(a, b), 5000),
  ]);
  return { listings, events, leads, devs, people, agencies, searches, market };
}

/* ---------- статистика цін (lib/priceStats.ts) ---------- */
/**
 * Відкриті житлові оголошення і їхні ціни станом на `asOf` — сирі дані для блоків
 * «Статистика цін». Історія — з listing_prices; до міграції 0036 її немає, тоді
 * минулих цін просто нема і відсотки за рік не показуються.
 */
export async function priceStatsRows(asOf: string): Promise<StatRow[]> {
  const client = await db();
  const sel = applyFilters(client.from('listings')
    .select('id, deal, type, beds, price, sqft, neighborhood, created_at'), {}).in('type', ['condo', 'house']);
  const { data, error } = await sel.limit(2000);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const old = rows.filter((r) => r.created_at <= asOf).map((r) => r.id);

  // остання ціна кожного оголошення на дату asOf (рядки йдуть від найновішого)
  const then = new Map<string, number>();
  if (old.length) {
    const { data: pts } = await client.from('listing_prices').select('listing_id, price, deal, changed_at')
      .in('listing_id', old).lte('changed_at', asOf).order('changed_at', { ascending: false }).limit(5000);
    const deal = new Map(rows.map((r) => [r.id, r.deal]));
    (pts ?? []).forEach((p: Row) => {
      if (!then.has(p.listing_id) && p.deal === deal.get(p.listing_id)) then.set(p.listing_id, Number(p.price));
    });
  }
  return rows.map((r) => ({
    deal: r.deal, type: r.type, beds: Number(r.beds) || 0, price: Number(r.price), sqft: Number(r.sqft) || 0,
    neighborhood: r.neighborhood, priceThen: then.get(r.id) ?? null,
  }));
}

/* ---------- сповіщення (міграція 0050) ---------- */
/**
 * Нові обʼєкти за збереженим пошуком після `since`. Клієнт передають ззовні: черга працює
 * без кукі (supabaseAnon), а RLS і так віддає лише опубліковане. Нове — це «вперше показане
 * покупцям» (published_at), бо оголошення могло довго чекати модерації; до 0049 — created_at.
 */
export async function newListingsSince(client: DB, query: ListingQuery, since: string, limit = 5) {
  const run = (col: string) => applySort(
    applyFilters(client.from('listings').select(listingCols(query), { count: 'exact' }), query).gt(col, since),
    'new', false,
  ).limit(limit);
  let { data, error, count } = await run('published_at');
  if (error && /published_at/.test(error.message ?? '')) ({ data, error, count } = await run('created_at'));
  if (error) throw error;
  const items: Listing[] = ((data ?? []) as Row[]).map(mapListing);
  return { items, count: count ?? 0 };
}

export async function getNotifySettings(userId: string): Promise<NotifySettings | null> {
  const { data, error } = await (await db()).from('notify_settings')
    .select('email_leads, email_alerts, telegram_chat_id, telegram_token').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    emailLeads: data.email_leads, emailAlerts: data.email_alerts,
    telegramLinked: data.telegram_chat_id !== null, telegramToken: data.telegram_token,
  };
}

export async function updateNotifySettings(userId: string, patch: { emailLeads?: boolean; emailAlerts?: boolean; unlinkTelegram?: boolean }) {
  const row: Row = {};
  if (typeof patch.emailLeads === 'boolean') row.email_leads = patch.emailLeads;
  if (typeof patch.emailAlerts === 'boolean') row.email_alerts = patch.emailAlerts;
  if (patch.unlinkTelegram) row.telegram_chat_id = null;
  if (!Object.keys(row).length) return;
  const { error } = await (await db()).from('notify_settings').update(row).eq('user_id', userId);
  if (error) throw error;
}

/* ---------- модерація і скарги (міграція 0049) ---------- */
/** Черга модерації: усе, що чекає перевірки, від найстарішого. */
export async function adminModerationQueue(): Promise<Listing[]> {
  const { data, error } = await (await db()).from('listings').select(listingCols({}))
    .eq('review', 'pending').order('created_at', { ascending: true }).limit(200);
  if (error) return [];
  return (data ?? []).map(mapListing);
}

/** Рішення модератора. Записує адмін від свого імені — тригер пропускає адміна як є. */
export async function adminReviewListing(id: string, decision: 'approved' | 'rejected', note: string) {
  const { data, error } = await (await db()).from('listings')
    .update({ review: decision, review_note: note.slice(0, 500) }).eq('id', id).select('id, title').maybeSingle();
  if (error) throw error;
  return data as { id: string; title: string } | null;
}

export const REPORT_REASONS: ReportReason[] = ['sold', 'wrong_price', 'wrong_info', 'photos', 'scam', 'duplicate', 'other'];

export async function createReport(input: { listingId: string; reason: ReportReason; message: string; email: string; userId: string | null }) {
  // без .select(): гість має право написати скаргу, але не читати її
  const { error } = await (await db()).from('listing_reports').insert({
    listing_id: input.listingId, reason: input.reason, message: input.message, email: input.email, user_id: input.userId,
  });
  if (error) throw error;
}

export async function adminListReports(): Promise<ListingReport[]> {
  const { data, error } = await (await db()).from('listing_reports')
    .select('*, listing:listings(title, active)').order('created_at', { ascending: false }).limit(300);
  if (error) return [];
  return (data ?? []).map((r: Row) => ({
    id: r.id, listingId: r.listing_id, listingTitle: r.listing?.title ?? '', listingActive: r.listing?.active ?? false,
    reason: r.reason, message: r.message ?? '', email: r.email ?? '', status: r.status, createdAt: r.created_at,
  }));
}

export async function adminSetReport(id: string, status: 'open' | 'resolved' | 'dismissed') {
  const { data, error } = await (await db()).from('listing_reports').update({ status }).eq('id', id)
    .select('id, listing_id').maybeSingle();
  if (error) throw error;
  return data as { id: string; listing_id: string } | null;
}

/* ---------- налаштування сайту (міграція 0052) ---------- */
const SITE_DEFAULTS: SiteSettings = { showPurchaseCosts: true, showFinancing: true };

/** До міграції 0052 таблиці немає — тоді все ввімкнено, як було. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await (await db()).from('site_settings')
    .select('show_purchase_costs, show_financing').eq('id', 1).maybeSingle();
  if (error || !data) return SITE_DEFAULTS;
  return { showPurchaseCosts: data.show_purchase_costs, showFinancing: data.show_financing };
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const row: Row = { updated_at: new Date().toISOString() };
  if (typeof patch.showPurchaseCosts === 'boolean') row.show_purchase_costs = patch.showPurchaseCosts;
  if (typeof patch.showFinancing === 'boolean') row.show_financing = patch.showFinancing;
  const { data, error } = await (await db()).from('site_settings').update(row).eq('id', 1)
    .select('show_purchase_costs, show_financing').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Settings are not set up yet');
  return { showPurchaseCosts: data.show_purchase_costs, showFinancing: data.show_financing };
}

/* ---------- імпорт оголошень і прайс забудовника (міграція 0054) ---------- */

/** Оголошення ріелтора з кодом зовнішньої системи. null — міграції 0054 ще немає. */
export async function getImportedListings(agentId: string, externalIds?: string[]): Promise<ImportedListing[] | null> {
  let sel = (await db()).from('listings')
    .select('id, external_id, active, review, title, deal, type, price, beds, baths, sqft, lot_acres, year, hoa, neighborhood, address, lat, lng, body, photos, oceanfront, tags, source_url')
    .eq('agent_id', agentId).neq('external_id', '');
  sel = externalIds ? sel.in('external_id', externalIds) : sel.limit(5000);
  const { data, error } = await sel;
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204' || /external_id/.test(error.message)) return null;
    throw error;
  }
  return (data ?? []).map((r: Row): ImportedListing => ({
    id: r.id, externalId: r.external_id, active: r.active, review: r.review ?? 'approved',
    title: r.title, deal: r.deal, type: r.type, price: Number(r.price), beds: r.beds, baths: Number(r.baths),
    sqft: r.sqft, lotAcres: Number(r.lot_acres), year: r.year, hoa: Number(r.hoa), neighborhood: r.neighborhood,
    address: r.address ?? '', lat: r.lat, lng: r.lng, text: r.body ?? '', photos: r.photos ?? [],
    oceanfront: r.oceanfront, tags: r.tags ?? [], sourceUrl: r.source_url ?? '',
  }));
}

/** Квартири ЖК для порівняння з прайсом */
export async function getDevelopmentUnits(developmentId: string): Promise<ExistingUnit[]> {
  const { data, error } = await (await db()).from('listings')
    .select('id, unit_no, building_id, beds, floor, sqft, price, status, title')
    .eq('development_id', developmentId).limit(5000);
  if (error) throw error;
  return (data ?? []).map((r: Row) => ({
    id: r.id, unitNo: r.unit_no ?? '', buildingId: r.building_id ?? null, beds: r.beds, floor: r.floor ?? null,
    sqft: r.sqft, price: Number(r.price), status: cleanStatus(r.status), title: r.title,
  }));
}

/**
 * Прайс однією транзакцією (RPC apply_price_list). null — функції ще немає (міграція 0054),
 * тоді маршрут зберігає по одній квартирі, як раніше.
 */
export async function applyPriceListRpc(input: {
  developmentId: string; buildingId: string | null; deal: Deal; added: unknown[]; changed: unknown[];
}): Promise<{ created: number; updated: number } | null> {
  const { data, error } = await (await db()).rpc('apply_price_list', {
    p_development: input.developmentId, p_building: input.buildingId, p_deal: input.deal,
    p_new: input.added, p_changes: input.changed,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return null;
    throw error;
  }
  return data as { created: number; updated: number };
}
