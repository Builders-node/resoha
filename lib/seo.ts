import type { Development, Listing } from './types';
import type { Lang } from './i18n';
import { localePath } from './i18n/paths';
import type { Guide } from './content/guides';
import { plain } from '@/components/Rich';
import { CONTACT_EMAIL, OPERATOR, SITE_NAME, SITE_URL } from './site';
import { TYPE_LABELS } from './format';

/**
 * schema.org-обʼєкти для JSON-LD. Пошуковики й AI-асистенти читають їх як довідку
 * «хто ми, що на сторінці і звідки цифри», тож тут лише те, що видно і на самій сторінці.
 */
const ORG_ID = `${SITE_URL}/#organization`;
const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

export const ORG_DESCRIPTION = 'Resoha is a property marketplace for Roatán and the Bay Islands, Honduras: homes, condos, rentals and land from island agencies in one searchable map, with a land passport on every lot.';

export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: OPERATOR,
    url: SITE_URL,
    logo: abs('/icon.svg'),
    description: ORG_DESCRIPTION,
    areaServed: { '@type': 'Place', name: 'Roatán, Bay Islands, Honduras' },
    knowsAbout: ['Roatán real estate', 'Bay Islands property', 'Honduras land title', 'buying property in Honduras as a foreigner'],
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

/** Стан обʼєкта → schema.org ItemAvailability: бронь, продано, здано видно й пошуковикам. */
const AVAILABILITY: Record<string, string> = {
  available: 'InStock',
  reserved: 'Reserved',
  sold: 'SoldOut',
  rented: 'OutOfStock',
};
const availabilityOf = (status: string) => `https://schema.org/${AVAILABILITY[status] ?? 'InStock'}`;

/** Оголошення як RealEstateListing з пропозицією (ціна) та обʼєктом (житло чи ділянка). */
export function listingLd(l: Listing, agentName?: string) {
  const url = abs(`/listings/${l.id}`);
  const place = {
    '@type': l.type === 'condo' ? 'Apartment' : l.type === 'house' ? 'SingleFamilyResidence' : 'Place',
    name: l.title,
    address: {
      '@type': 'PostalAddress',
      streetAddress: l.address || undefined,
      addressLocality: l.neighborhood,
      addressRegion: 'Islas de la Bahía',
      addressCountry: 'HN',
    },
    geo: l.lat && l.lng ? { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } : undefined,
    ...(l.type !== 'land' && l.beds > 0 ? { numberOfRooms: l.beds, numberOfBedrooms: l.beds } : {}),
    ...(l.type !== 'land' && l.baths > 0 ? { numberOfBathroomsTotal: l.baths } : {}),
    ...(l.sqft > 0 ? { floorSize: { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' } } : {}),
    ...(l.year > 0 ? { yearBuilt: l.year } : {}),
  };
  return {
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    url,
    name: l.title,
    description: l.text.slice(0, 500),
    datePosted: l.createdAt,
    image: l.photos.filter((p) => p.startsWith('http') || p.startsWith('/')).slice(0, 5).map(abs),
    category: `${TYPE_LABELS[l.type]} ${l.deal === 'rent' ? 'for rent' : 'for sale'}`,
    offers: {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'USD',
      businessFunction: l.deal === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: availabilityOf(l.status),
      ...(l.deal === 'rent' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: l.price, priceCurrency: 'USD', unitCode: 'MON' } } : {}),
      ...(agentName ? { offeredBy: { '@type': 'RealEstateAgent', name: agentName } } : {}),
    },
    mainEntity: place,
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
      addressRegion: 'Islas de la Bahía',
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
