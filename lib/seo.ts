import type { Listing } from './types';
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
      availability: 'https://schema.org/InStock',
      ...(l.deal === 'rent' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: l.price, priceCurrency: 'USD', unitCode: 'MON' } } : {}),
      ...(agentName ? { offeredBy: { '@type': 'RealEstateAgent', name: agentName } } : {}),
    },
    mainEntity: place,
  };
}
