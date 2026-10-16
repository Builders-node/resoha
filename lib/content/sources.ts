/**
 * Зовнішні джерела цифр, на які посилаються гайди, сторінки районів і звіт по ринку.
 * Цифра без джерела на сайт не потрапляє: і Google, і AI-пошук цитують те, що можна перевірити.
 */
export type Source = { name: string; title: string; url: string };

export const SOURCES = {
  buyingRoatan: {
    name: 'Buying Roatan',
    title: 'Buying a home in Roatán: June 2026 market summary',
    url: 'https://buyingroatan.com/blog/buying-a-home-in-roatan-june-2026-market-summary/',
  },
  latMarket: {
    name: 'The LatInvestor',
    title: 'Roatán Island real-estate market analysis, 2026',
    url: 'https://thelatinvestor.com/blogs/news/roatan-island-real-estate-market',
  },
  latRisks: {
    name: 'The LatInvestor',
    title: 'Risks and pitfalls of buying on Roatán',
    url: 'https://thelatinvestor.com/blogs/news/roatan-island-risks-pitfalls',
  },
  latTaxes: {
    name: 'The LatInvestor',
    title: 'Roatán property taxes and fees',
    url: 'https://thelatinvestor.com/blogs/news/roatan-island-property-taxes-fees',
  },
  gpg: {
    name: 'Global Property Guide',
    title: 'Honduras buying guide: transaction costs and restrictions',
    url: 'https://www.globalpropertyguide.com/Latin-America/Honduras/Buying-Guide',
  },
  decree9090: {
    name: 'Tribunal Superior de Cuentas (Honduras)',
    title: 'Decreto 90-90: Ley para la Adquisición de Bienes Urbanos en las Áreas que delimita el Artículo 107 de la Constitución',
    url: 'https://www.tsc.gob.hn/web/leyes/Ley%20para%20la%20Adquisicion%20de%20Bienes%20Urbanos%20en%20las%20Areas%20que...%20%28Decreto%2090-90%29%20%2808%29.pdf',
  },
  figueroa: {
    name: 'Tomas Figueroa',
    title: 'Roatán real-estate market 2026',
    url: 'https://www.tomasfigueroa.com/roatan-market',
  },
  airdna: {
    name: 'AirDNA',
    title: 'Short-term rental data: Roatán, Islas de la Bahía',
    url: 'https://www.airdna.co/vacation-rental-data/app/hn/roatan/islas-de-la-bahia/overview',
  },
  cruise: {
    name: 'Revista E&N',
    title: 'Two of the world’s largest cruise ships arrive in Roatán (March 2025)',
    url: 'https://www.revistaeyn.com/centroamericaymundo/dos-de-los-cruceros-mas-grandes-del-mundo-llegan-a-roatan-honduras-GC25148952',
  },
  flights: {
    name: 'FlightConnections',
    title: 'Direct flights to Roatán (RTB)',
    url: 'https://www.flightconnections.com/flights-to-coxen-hole-rtb',
  },
  encuentra: {
    name: 'Encuentra24',
    title: 'Property for sale in Roatán, Islas de la Bahía',
    url: 'https://www.encuentra24.com/honduras-es/bienes-raices-venta-de-propiedades-en-islas/islas-de-la-bahia-roatan',
  },
  nhcClimo: {
    name: 'National Hurricane Center (NOAA)',
    title: 'Tropical cyclone climatology: the Atlantic hurricane season',
    url: 'https://www.nhc.noaa.gov/climo/',
  },
  nhcMitch: {
    name: 'National Hurricane Center (NOAA)',
    title: 'Tropical cyclone report: Hurricane Mitch, 22 October – 5 November 1998',
    url: 'https://www.nhc.noaa.gov/data/tcr/AL131998_Mitch.pdf',
  },
  nhcEta: {
    name: 'National Hurricane Center (NOAA)',
    title: 'Tropical cyclone report: Hurricane Eta, 31 October – 13 November 2020',
    url: 'https://www.nhc.noaa.gov/data/tcr/AL292020_Eta.pdf',
  },
  nhcIota: {
    name: 'National Hurricane Center (NOAA)',
    title: 'Tropical cyclone report: Hurricane Iota, 13–18 November 2020',
    url: 'https://www.nhc.noaa.gov/data/tcr/AL312020_Iota.pdf',
  },
  westBayBeach: {
    name: 'West Bay Tours',
    title: 'The best beach in Roatán: West Bay Beach',
    url: 'https://roatan.westbaytours.com/the-best-beach-in-roatan-west-bay-beach/',
  },
  snorkelWestEnd: {
    name: 'Snorkeling Report',
    title: 'Snorkeling at West End and Half Moon Bay, Roatán',
    url: 'https://www.snorkeling-report.com/spot/snorkeling-west-end-roatan/',
  },
  fodorsSights: {
    name: 'Fodor’s Travel',
    title: 'Best sights in Roatán and the Bay Islands',
    url: 'https://www.fodors.com/world/mexico-and-central-america/honduras/roatan-and-the-bay-islands/things-to-do/sights',
  },
  fodorsFood: {
    name: 'Fodor’s Travel',
    title: 'Best restaurants in Roatán',
    url: 'https://www.fodors.com/world/mexico-and-central-america/honduras/roatan-and-the-bay-islands/places/roatan/restaurants',
  },
  westEndFood: {
    name: 'Sally Sees',
    title: 'Restaurants in West End, Roatán (2025)',
    url: 'https://sallysees.com/restaurants-in-west-end-roatan/',
  },
  blackPearl: {
    name: 'Top 100 Golf Courses',
    title: 'Black Pearl at Pristine Bay',
    url: 'https://www.top100golfcourses.com/golf-course/black-pearl-at-pristine-bay',
  },
} satisfies Record<string, Source>;
