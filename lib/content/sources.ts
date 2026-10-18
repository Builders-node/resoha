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
  latTguSqm: {
    name: 'The LatInvestor',
    title: 'Price per square metre in Tegucigalpa, 2026',
    url: 'https://thelatinvestor.com/blogs/news/square-meter-tegucigalpa',
  },
  tguWaterRationing: {
    name: 'El Heraldo',
    title: 'Tegucigalpa faces a water crisis and tightens rationing (August 2026)',
    url: 'https://www.elheraldo.hn/tegucigalpa/tegucigalpa-afronta-crisis-agua-endurecen-racionamiento-JE31712597',
  },
  tguWaterTrucks: {
    name: 'La Tribuna',
    title: 'Dams fall to critical levels and the cost of water in the colonias soars (August 2026)',
    url: 'https://www.latribuna.hn/2026/08/26/represas-caen-a-niveles-criticos-y-se-dispara-el-costo-del-agua-en-las-colonias/',
  },
  tguLandslideRisk: {
    name: 'El Heraldo',
    title: 'About 600 colonias in the capital at risk from rain and landslides (May 2026)',
    url: 'https://www.elheraldo.hn/tegucigalpa/600-colonias-capital-riesgo-lluvias-derrumbes-MM30873870',
  },
  rapBanhprovi: {
    name: 'El Heraldo',
    title: 'RAP vs. Banhprovi: rates, terms and requirements for housing loans in Honduras (April 2026)',
    url: 'https://www.elheraldo.hn/elheraldoplus/fondos-rap-banhprovi-tasas-plazos-requisitos-prestamo-vivienda-BI30387314',
  },
  laprensaSpsPrices: { name: 'La Prensa (Honduras)', title: 'Crisis inmobiliaria: altos precios y poca oferta de casas y terrenos en San Pedro Sula (September 2025)', url: 'https://www.laprensa.hn/honduras/crisis-inmobiliaria-san-pedro-sula-precios-viviendas-OE27234857' },
  laprensaSpsTowers: { name: 'La Prensa (Honduras)', title: 'San Pedro Sula crece para arriba: precios de las nuevas torres residenciales (March 2026)', url: 'https://www.laprensa.hn/fotogalerias/honduras/san-pedro-sula-torres-residenciales-precios-vivienda-vertical-EG29589836' },
  laprensaSpsRents: { name: 'La Prensa (Honduras)', title: 'Casas en San Pedro Sula desde $1,000: alquileres en dólares y altos precios (November 2025)', url: 'https://www.laprensa.hn/fotogalerias/honduras/honduras-alquileres-dolares-altos-precios-sector-inmobiliario-MN28161937' },
  heraldoIotaSula: { name: 'El Heraldo (Honduras)', title: 'Pesadilla sufren en el valle de Sula tras el paso de Iota y Eta (November 2020)', url: 'https://www.elheraldo.hn/pais/1423688-468/pesadilla-sufren-en-el-valle-de-sula-tras-el-paso-de-iota' },
  finBanhproviFunds: { name: 'El Heraldo', title: 'Banhprovi housing funds in 2026 and how to apply (1 July 2026)', url: 'https://www.elheraldo.hn/fotogalerias/honduras/hay-fondos-en-banhprovi-para-comprar-vivienda-2026-asi-puede-aplicar-KI31280864' },
  finBanhproviShortage: { name: 'La Prensa', title: 'Banhprovi faces a funding shortfall for housing loans (20 July 2026)', url: 'https://www.laprensa.hn/honduras/banhprovi-sin-fondos-creditos-vivienda-honduras-IC31445591' },
  finBanhproviCaf: { name: 'El Heraldo', title: 'When Banhprovi funds will reach private banks for housing loans (25 July 2026)', url: 'https://www.elheraldo.hn/fotogalerias/honduras/cuando-estaran-disponibles-fondos-de-banhprovi-en-la-banca-privada-para-prestamos-vivienda-2026-MG31514282' },
  finRapVsBanhprovi: { name: 'El Heraldo', title: 'RAP vs. Banhprovi: rates, terms and requirements for a housing loan (28 April 2026)', url: 'https://www.elheraldo.hn/elheraldoplus/fondos-rap-banhprovi-tasas-plazos-requisitos-prestamo-vivienda-BI30387314' },
  finRapRates: { name: 'Tu Nota', title: 'RAP lowers housing loan rates (8 April 2026)', url: 'https://www.tunota.com/economia/interes-vivienda-social-rap-porcentajes-2026-04-08' },
  finSeviahPlan: { name: 'La Prensa', title: 'Secretaría de Vivienda proposes subsidies of up to L82,500 (21 July 2026)', url: 'https://www.laprensa.hn/honduras/seviah-subsidios-vivienda-social-plan-inclusion-financiera-2026-2030-NA31469985' },
  finSeviahBono: { name: 'La Prensa', title: 'Francis Argeñal (Seviah) on the 100% housing bonus (24 June 2026)', url: 'https://www.laprensa.hn/premium/francis-argenal-familias-medio-salario-bono-vivienda-terreno-pobreza-HB31211987' },
  finBankRates: { name: 'El Heraldo', title: 'Average lending rate falls in Honduras (27 July 2026)', url: 'https://www.elheraldo.hn/economia/dineroynegocios/tasa-interes-activa-baja-honduras-quienes-favorece-caida-OE31531609' },
  finIncome: { name: 'La Prensa', title: 'A L50,000 salary is not enough to buy a house in Honduras (8 September 2025)', url: 'https://www.laprensa.hn/honduras/comprar-casa-honduras-ingresos-2025-GC27258970' },
  finLatMortgage: { name: 'The LatInvestor', title: 'Getting a mortgage in Honduras as a foreigner', url: 'https://thelatinvestor.com/blogs/news/honduras-mortgage' },
  nrcHlp: { name: 'Norwegian Refugee Council', title: 'Nowhere is safe: housing, land and property rights in Honduras', url: 'https://www.nrc.no/globalassets/pdf/reports/nowhere-is-safe/nowhere-is-safe---hlp-rights-for-persons-affected-by-displacement-in-honduras.pdf' },
  heraldoLots: { name: 'El Heraldo', title: 'Alcaldía de Choluteca tras urbanizaciones ilegales (July 2017)', url: 'https://www.elheraldo.hn/pais/1094280-468/alcald%C3%ADa-de-choluteca-tras-urbanizaciones-ilegales' },
  latForeigners: { name: 'The LatInvestor', title: 'Buying real estate in Honduras as a foreigner', url: 'https://thelatinvestor.com/blogs/news/honduras-foreigner-rights' },
  numbeoRoatan: { name: 'Numbeo', title: 'Cost of living in Roatán, Honduras (updated November 2025)', url: 'https://www.numbeo.com/cost-of-living/in/Roatan-Honduras' },
  expatExchangeRoatan: { name: 'Expat Exchange', title: 'Cost of living in Roatán', url: 'https://expatexchange.com/article/8396/Cost-of-Living-in-Roatan-Cost-of-Living-in-Roatan' },
  intLivingRoatan: { name: 'International Living', title: 'Roatán, Honduras: cost of living and retirement (updated January 2026)', url: 'https://internationalliving.com/countries/honduras/roatan-honduras/' },
  lioRoatan: { name: 'Live and Invest Overseas', title: 'Roatán, Honduras country hub: cost of living and residency', url: 'https://www.liveandinvestoverseas.com/country-hub/honduras/roatan/' },
  latExpat: { name: 'The LatInvestor', title: 'Roatán Island expat guide (updated September 2026)', url: 'https://thelatinvestor.com/blogs/news/roatan-island-expat-guide' },
  sgjdPensionado: { name: 'Secretaría de Gobernación, Justicia y Descentralización (Honduras)', title: 'Requisitos para obtener residencia en calidad de pensionado', url: 'https://www.sgjd.gob.hn/servicios-y-gestiones-web/requisitos/servicios-de-atencion-al-ciudadano/extranjeria/requisitos-servicios-extranjerias/1937-requisitos-para-obtener-residencia-en-calidad-de-pensionado-1/file' },
  sgjdRentista: { name: 'Secretaría de Gobernación, Justicia y Descentralización (Honduras)', title: 'Requisitos para obtener residencia como rentista', url: 'https://www.sgjd.gob.hn/servicios-y-gestiones-web/requisitos/servicios-de-atencion-al-ciudadano/extranjeria/1915-requisitos-para-obtener-residencia-como-rentista/file' },
  payaReco: { name: 'Paya Magazine', title: 'Not so eco RECO: Roatán’s power plant expansion (July 2024)', url: 'https://payamag.com/2024/07/08/not-so-eco-reco/' },
  latribunaFx: { name: 'La Tribuna', title: 'BCH: lempira depreciation slows and the dollar could reach L27 in 2026 (August 2026)', url: 'https://www.latribuna.hn/2026/08/26/bch-depreciacion-del-lempira-se-desacelera-y-el-dolar-podria-llegar-a-l27-en-2026/' },
} satisfies Record<string, Source>;
