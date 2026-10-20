import type { Agency, Agent, Developer, Development, Listing } from './types';
import { makeT, type Lang } from './i18n';
import { localePath } from './i18n/paths';
import type { Guide } from './content/guides';
import { readingMinutes, topicBySlug, type Post } from './content/blog';
import { plain } from '@/components/Rich';
import { CONTACT_EMAIL, OPERATOR, SITE_NAME, SITE_URL } from './site';
import { DEAL_LABELS, TYPE_LABELS, photoUrl } from './format';
import { EMPTY_FILTERS, type Filters } from './filters';
import { PAGE_SIZE } from './db';
import { catalogTitle, catalogUrl, isIndexable } from './catalogSeo';
import { IN_UNIT } from './details';
import { REGIONS, regionByName } from './regions';

/**
 * schema.org-обʼєкти для JSON-LD. Пошуковики й AI-асистенти читають їх як довідку
 * «хто ми, що на сторінці і звідки цифри», тож тут лише те, що видно і на самій сторінці.
 */
const ORG_ID = `${SITE_URL}/#organization`;
const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

export const ORG_DESCRIPTION = 'Hogarli is a property marketplace for Honduras: Roatán and the Bay Islands, San Pedro Sula and Tegucigalpa. Homes, condos, rentals and land from local agencies in one searchable map, with a land passport on every lot.';

export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: OPERATOR,
    url: SITE_URL,
    logo: abs('/icon-512.png'),
    description: ORG_DESCRIPTION,
    areaServed: REGIONS.map((r) => ({ '@type': 'Place', name: `${r.name}, ${r.department}, Honduras` })),
    knowsAbout: [...REGIONS.map((r) => `${r.name} real estate`), 'Bay Islands property', 'Honduras land title', 'buying property in Honduras as a foreigner'],
    ...(CONTACT_EMAIL ? { email: CONTACT_EMAIL } : {}),
  };
}

export function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/listings?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })),
  };
}

export function articleLd(g: Guide) {
  const url = abs(`/guides/${g.slug}`);
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: g.title,
    description: g.description,
    abstract: plain(g.answer),
    url,
    mainEntityOfPage: url,
    datePublished: g.published,
    dateModified: g.updated,
    inLanguage: 'en',
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    about: { '@type': 'Place', name: 'Roatán, Honduras' },
    citation: g.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.name })),
  };
}

/**
 * Стаття блогу: BlogPosting у складі Blog — так Google показує дату й автора в сніпеті.
 * Сторінка передає вже перекладений текст; адреси й inLanguage під /es править JsonLd (localizeLd).
 */
export function blogPostingLd(p: Post) {
  const url = abs(`/blog/${p.slug}`);
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: p.title,
    description: p.description,
    abstract: plain(p.lead),
    url,
    mainEntityOfPage: url,
    image: `${url}/cover.png`,
    datePublished: p.published,
    dateModified: p.updated,
    inLanguage: 'en',
    articleSection: topicBySlug(p.topic)?.name,
    timeRequired: `PT${readingMinutes(p)}M`,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': `${abs('/blog')}#blog` },
    about: { '@type': 'Place', name: 'Honduras' },
    ...(p.sources.length ? { citation: p.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.name })) } : {}),
  };
}

/** Сам блог: список статей для сторінки /blog. */
export function blogLd(posts: Post[]) {
  return {
    '@type': 'Blog',
    '@id': `${abs('/blog')}#blog`,
    name: `${SITE_NAME} Blog`,
    url: abs('/blog'),
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: abs(`/blog/${p.slug}`),
      datePublished: p.published,
      dateModified: p.updated,
    })),
  };
}

/** Стан обʼєкта → schema.org ItemAvailability: бронь, продано, здано видно й пошуковикам. */
const AVAILABILITY: Record<string, string> = {
  available: 'InStock',
  reserved: 'Reserved',
  sold: 'SoldOut',
  rented: 'OutOfStock',
};
const availabilityOf = (status: string) => `https://schema.org/${AVAILABILITY[status] ?? 'InStock'}`;

/** Що з «в квартирі» і тегів варто віддати як amenityFeature — без службових міток. */
const amenities = (l: Listing) => [
  ...(l.oceanfront ? ['Oceanfront'] : []),
  ...(l.details.inUnit ?? []).map((k) => IN_UNIT.find(([key]) => key === k)?.[1] ?? ''),
  ...l.tags,
].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 20);

/**
 * Оголошення як RealEstateListing з пропозицією (ціна, продавець) та обʼєктом (житло чи ділянка).
 * Опис — мовою сторінки; продавець — ріелтор і агенція з посиланнями на їхні сторінки.
 */
export function listingLd(l: Listing, opts: {
  agent?: { id: string; name: string } | null;
  agency?: { id: string; name: string } | null;
  description?: string;
  lang?: Lang;
} = {}) {
  const url = abs(`/listings/${l.id}`);
  const region = regionByName(l.island) ?? REGIONS[0];
  const photos = l.photos.filter((p) => p.startsWith('http') || p.startsWith('/')).map(abs);
  const features = amenities(l);
  const place = {
    '@type': l.type === 'condo' ? 'Apartment' : l.type === 'house' ? 'SingleFamilyResidence' : 'Place',
    name: l.title,
    address: {
      '@type': 'PostalAddress',
      streetAddress: l.address || undefined,
      addressLocality: l.neighborhood,
      addressRegion: region.department,
      addressCountry: 'HN',
    },
    geo: l.lat && l.lng ? { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } : undefined,
    ...(photos.length ? { photo: photos.slice(0, 10).map((u) => ({ '@type': 'ImageObject', url: u })) } : {}),
    ...(l.type !== 'land' && l.beds > 0 ? { numberOfRooms: l.beds, numberOfBedrooms: l.beds } : {}),
    ...(l.type !== 'land' && l.baths > 0 ? { numberOfBathroomsTotal: l.baths } : {}),
    ...(l.sqft > 0 ? { floorSize: { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' } } : {}),
    ...(l.lotAcres > 0 ? { lotSize: { '@type': 'QuantitativeValue', value: l.lotAcres, unitCode: 'ACR' } } : {}),
    ...(l.year > 0 ? { yearBuilt: l.year } : {}),
    ...(l.floor !== null && l.type === 'condo' ? { floorLevel: String(l.floor) } : {}),
    ...(features.length ? { amenityFeature: features.map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })) } : {}),
    ...(l.details.pets === 'yes' ? { petsAllowed: true } : l.details.pets === 'no' ? { petsAllowed: false } : {}),
    containedInPlace: l.development
      ? { '@type': 'ApartmentComplex', '@id': `${abs(`/developments/${l.development.slug}`)}#complex`, name: l.development.name, url: abs(`/developments/${l.development.slug}`) }
      : { '@type': 'Place', name: `${l.neighborhood}, ${region.name}, Honduras` },
  };
  const seller = opts.agency
    ? { '@type': 'RealEstateAgent', name: opts.agency.name, url: abs(`/agency/${opts.agency.id}`) }
    : opts.agent ? { '@type': 'RealEstateAgent', name: opts.agent.name, url: abs(`/agents/${opts.agent.id}`) } : undefined;
  return {
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    url,
    name: l.title,
    description: (opts.description || l.text).slice(0, 1000),
    inLanguage: opts.lang ?? 'en',
    datePosted: l.createdAt,
    dateModified: l.updatedAt || l.createdAt,
    image: photos.slice(0, 10),
    category: `${TYPE_LABELS[l.type]} ${l.deal === 'rent' ? 'for rent' : 'for sale'}`,
    ...(opts.agent ? { author: { '@type': 'Person', name: opts.agent.name, url: abs(`/agents/${opts.agent.id}`) } } : {}),
    publisher: { '@id': ORG_ID },
    offers: {
      '@type': 'Offer',
      url,
      price: l.price,
      priceCurrency: 'USD',
      businessFunction: l.deal === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: availabilityOf(l.status),
      ...(l.deal === 'rent' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: l.price, priceCurrency: 'USD', unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } } } : {}),
      ...(seller ? { seller, offeredBy: seller } : {}),
      itemOffered: { '@id': `${url}#property` },
    },
    mainEntity: { '@id': `${url}#property`, ...place },
  };
}

/** Етап продажів ЖК → наявність для зведеної пропозиції. */
const SALES_AVAILABILITY: Record<string, string> = { open: 'InStock', presale: 'PreSale', closed: 'SoldOut' };

/**
 * ЖК як RealEstateListing: обʼєкт — ApartmentComplex (адреса, координати, кількість квартир,
 * зручності), пропозиція — AggregateOffer з діапазоном цін і окремим Offer на кожну квартиру.
 * Ціни — лише продаж: оренда в тому самому діапазоні змішала б $/міс і повну ціну.
 */
export function developmentLd(d: Development, units: Listing[]) {
  const url = abs(`/developments/${d.slug}`);
  const complexId = `${url}#complex`;
  const sale = units.filter((u) => u.deal === 'sale' && u.price > 0);
  const open = sale.filter((u) => u.status === 'available' || u.status === 'reserved');
  const priced = open.length ? open : sale;
  const complex = {
    '@type': 'ApartmentComplex',
    '@id': complexId,
    name: d.name,
    url,
    description: d.text ? d.text.slice(0, 500) : undefined,
    image: d.photos.filter((p) => p.startsWith('http') || p.startsWith('/')).slice(0, 5).map(abs),
    address: {
      '@type': 'PostalAddress',
      streetAddress: d.address || undefined,
      addressLocality: d.neighborhood,
      addressRegion: (regionByName(d.island) ?? REGIONS[0]).department,
      addressCountry: 'HN',
    },
    geo: d.lat && d.lng ? { '@type': 'GeoCoordinates', latitude: d.lat, longitude: d.lng } : undefined,
    ...(units.length ? { numberOfAccommodationUnits: units.length } : {}),
    ...(open.length ? { numberOfAvailableAccommodationUnits: open.length } : {}),
    ...(d.amenities.length ? {
      amenityFeature: d.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    } : {}),
  };
  return {
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    url,
    name: d.name,
    description: (d.text || `${d.name}, ${d.neighborhood}, Roatán`).slice(0, 500),
    datePosted: d.createdAt,
    mainEntity: complex,
    ...(priced.length ? {
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: Math.min(...priced.map((u) => u.price)),
        highPrice: Math.max(...priced.map((u) => u.price)),
        offerCount: open.length || priced.length,
        availability: `https://schema.org/${open.length ? (SALES_AVAILABILITY[d.sales] ?? 'InStock') : 'SoldOut'}`,
        itemOffered: { '@id': complexId },
        // квартир буває сотні — у розмітку йдуть перші 50 за ціною
        offers: sale.slice(0, 50).map((u) => ({
          '@type': 'Offer',
          url: abs(`/listings/${u.id}`),
          name: u.unitNo ? `${d.name}, unit ${u.unitNo}` : u.title,
          price: u.price,
          priceCurrency: 'USD',
          availability: availabilityOf(u.status),
          businessFunction: 'http://purl.org/goodrelations/v1#Sell',
        })),
      },
    } : {}),
  };
}

/** Райони без повторів і порожніх → areaServed. */
const placesOf = (names: string[]) => [...new Set(names.filter(Boolean))]
  .map((name) => ({ '@type': 'Place', name: `${name}, Honduras` }));

/**
 * Сторінка каталогу: ItemList показаних оголошень і «хлібні крихти» Головна → розділ → добірка.
 * Лише для індексованих комбінацій; для решти — null, розмітки немає.
 */
export function catalogLd(f: Filters, items: Pick<Listing, 'id' | 'title'>[], page: number, lang: Lang) {
  if (!isIndexable(f) || !items.length || (f.deal !== 'sale' && f.deal !== 'rent')) return null;
  const t = makeT(lang);
  const title = catalogTitle(f, lang);
  const path = catalogUrl(f, page);
  const section = catalogUrl({ ...EMPTY_FILTERS, deal: f.deal });
  const offset = (page - 1) * PAGE_SIZE;
  return [
    {
      '@type': 'ItemList',
      '@id': `${abs(path)}#list`,
      name: title,
      url: abs(path),
      numberOfItems: items.length,
      itemListElement: items.map((l, i) => ({
        '@type': 'ListItem', position: offset + i + 1, url: abs(`/listings/${l.id}`), name: l.title,
      })),
    },
    breadcrumbLd([
      { name: t('Home'), path: '/' },
      // добірка «лише продаж» і є сторінкою розділу — другої крихти з тією ж адресою не треба
      ...(catalogUrl(f) !== section ? [{ name: t(DEAL_LABELS[f.deal]), path: section }] : []),
      { name: title, path },
    ]),
  ];
}

/** Ріелтор: лише те, що видно на його сторінці (телефон показуємо, пошту — ні). */
export function agentLd(a: Agent, agency: Pick<Agency, 'id' | 'name'> | null, areas: string[]) {
  const url = abs(`/agents/${a.id}`);
  const image = photoUrl(a.avatar);
  const served = placesOf(areas);
  return {
    '@type': 'RealEstateAgent',
    '@id': `${url}#agent`,
    name: a.name,
    url,
    ...(image ? { image: abs(image) } : {}),
    ...(a.about ? { description: a.about.slice(0, 500) } : {}),
    ...(a.phone ? { telephone: a.phone } : {}),
    ...(a.languages.length ? { knowsLanguage: a.languages } : {}),
    ...(served.length ? { areaServed: served } : {}),
    ...(agency ? { parentOrganization: { '@type': 'RealEstateAgent', '@id': `${abs(`/agency/${agency.id}`)}#agency`, name: agency.name, url: abs(`/agency/${agency.id}`) } } : {}),
  };
}

/** Агенція: контакти з шапки сторінки, райони з її оголошень, команда — посиланнями на ріелторів. */
export function agencyLd(a: Agency, team: Pick<Agent, 'id' | 'name'>[], areas: string[], description: string) {
  const url = abs(`/agency/${a.id}`);
  const served = placesOf(areas);
  return {
    '@type': 'RealEstateAgent',
    '@id': `${url}#agency`,
    name: a.name,
    url,
    ...(description ? { description: description.slice(0, 500) } : {}),
    ...(a.phone ? { telephone: a.phone } : {}),
    ...(a.email ? { email: a.email } : {}),
    ...(served.length ? { areaServed: served } : {}),
    ...(team.length ? { employee: team.map((m) => ({ '@type': 'Person', name: m.name, url: abs(`/agents/${m.id}`) })) } : {}),
  };
}

/** Забудовник як Organization і його ЖК окремим ItemList (makesOffer вимагав би цін). */
export function developerLd(d: Developer, projects: Pick<Development, 'slug' | 'name' | 'neighborhood'>[]) {
  const url = abs(`/developers/${d.slug}`);
  const logo = photoUrl(d.logo);
  const served = placesOf(projects.map((p) => p.neighborhood));
  const site = /^https?:\/\//.test(d.website) ? d.website : '';
  const org = {
    '@type': 'Organization',
    '@id': `${url}#developer`,
    name: d.name,
    url,
    ...(logo ? { logo: abs(logo), image: abs(logo) } : {}),
    ...(d.about ? { description: d.about.slice(0, 500) } : {}),
    ...(d.founded ? { foundingDate: String(d.founded) } : {}),
    ...(d.phone ? { telephone: d.phone } : {}),
    ...(d.email ? { email: d.email } : {}),
    ...(site ? { sameAs: [site] } : {}),
    ...(served.length ? { areaServed: served } : {}),
  };
  if (!projects.length) return [org];
  return [org, {
    '@type': 'ItemList',
    '@id': `${url}#developments`,
    name: `${d.name} developments`,
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, url: abs(`/developments/${p.slug}`), name: p.name,
    })),
  }];
}

const LINK_KEYS = new Set(['url', 'item', 'mainEntityOfPage', '@id', 'urlTemplate']);

/**
 * Розмітка для мовної версії сторінки: внутрішні посилання ведуть на /es, inLanguage — es.
 * Ідентифікатори організації й сайту спільні для обох мов, тож їх не чіпаємо.
 */
export function localizeLd<T>(node: T, lang: Lang): T {
  if (lang === 'en') return node;
  const walk = (v: unknown, key?: string): unknown => {
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    if (typeof v !== 'string' || !key) return v;
    if (key === 'inLanguage') return lang;
    if (LINK_KEYS.has(key) && v.startsWith(`${SITE_URL}/`)) {
      const rest = v.slice(SITE_URL.length);
      return /^\/#(organization|website)$/.test(rest) ? v : `${SITE_URL}${localePath(lang, rest)}`;
    }
    return v;
  };
  return walk(node) as T;
}
