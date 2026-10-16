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
  sarTradicion: {
    name: 'Servicio de Administración de Rentas (SAR)',
    title: 'Impuesto sobre Tradición de Bienes Inmuebles (código 152): guía de declaración',
    url: 'https://www.sar.gob.hn/wp-content/uploads/2024/10/AYUDA-DECLARACION-IMPUESTO-SOBRE-TRADICION-DE-BIENES-INMUEBLES-CODIGO-152.pdf',
  },
  ipFees: {
    name: 'La Prensa',
    title: 'Tasas de registro de inmuebles del Instituto de la Propiedad (2023)',
    url: 'https://www.laprensa.hn/premium/servicios/tramites/honduras-tasas-registro-inmueble-instituto-propiedad-GG13046220',
  },
  consulMiami: {
    name: 'La Prensa',
    title: 'Consulado de Honduras en Miami: trámites y tarifas (2025)',
    url: 'https://www.laprensa.hn/usa/estados-unidos-consulado-honduras-miami-necesitas-saber-tramite-pasaporte-IE25568022',
  },
  poderConsular: {
    name: 'RedHonduras',
    title: 'Requisitos y tarifa consular de un poder especial',
    url: 'https://redhonduras.hn/?p=54568',
  },
  hcchApostille: {
    name: 'HCCH',
    title: 'Apostille Convention: status table',
    url: 'https://www.hcch.net/en/instruments/conventions/status-table/print/?cid=24',
  },
  scam2017: {
    name: 'La Prensa',
    title: 'Estafan a clientes con venta de casas ajenas (2017)',
    url: 'https://www.laprensa.hn/honduras/estafadores-honduras-casas-ajenas-venta-casas-instituto-propiedad-vivienda-corrupcion-DFLP1081662',
  },
  atlantidaAbroad: {
    name: 'El Heraldo',
    title: 'Hondureños dentro y fuera del país prefieren Banco Atlántida para ahorrar (2025)',
    url: 'https://www.elheraldo.hn/economia/dineroynegocios/hondurenos-dentro-fuera-prefieren-banco-atlantida-ahorrar-KE26447094',
  },
  banhproviMigrants: {
    name: 'La Prensa',
    title: 'Requisitos de los fondos Banhprovi para vivienda de hondureños en Estados Unidos (2024)',
    url: 'https://www.laprensa.hn/economia/requisitos-fondos-banhprovi-vivienda-estados-unidos-honduras-migrantes-DH22619219',
  },
  banhprovi2023: {
    name: 'El Heraldo',
    title: 'Más de 300 solicitudes de vivienda en Estados Unidos (2024)',
    url: 'https://www.elheraldo.hn/economia/mas-de-300-solicitudes-de-vivienda-se-tuvo-en-estados-unidos-DF17121992',
  },
  banhprovi2026: {
    name: 'La Prensa',
    title: 'Fondos Banhprovi: cuotas por tipo de vivienda en 2026',
    url: 'https://www.laprensa.hn/economia/honduras-fondos-banhprovi-cuotas-tipo-vivienda-2026-PD29199776',
  },
  rapBanhprovi: {
    name: 'El Heraldo',
    title: 'Fondos RAP y Banhprovi: tasas, plazos y requisitos (2026)',
    url: 'https://www.elheraldo.hn/portada/fondos-rap-banhprovi-tasas-plazos-requisitos-prestamo-vivienda-BI30387314',
  },
  bankRates2026: {
    name: 'El Heraldo',
    title: 'La tasa de interés para vivienda baja; la banca se ubica en 12% promedio (2026)',
    url: 'https://www.elheraldo.hn/economia/tasa-interes-vivienda-baja-3-24-banca-ubica-12-promedio-OK29893184',
  },
  spsPrices2025: {
    name: 'La Prensa',
    title: 'Crisis inmobiliaria en San Pedro Sula: precios de viviendas (2025)',
    url: 'https://www.laprensa.hn/honduras/crisis-inmobiliaria-san-pedro-sula-precios-viviendas-OE27234857',
  },
  spsLand2019: {
    name: 'La Prensa',
    title: 'Hasta 350 dólares cuesta la vara cuadrada en el noroeste de San Pedro Sula (2019)',
    url: 'https://www.laprensa.hn/sanpedro/hasta-350-dolares-cuesta-la-vara-cuadrada-en-el-noroeste-de-san-EVLP1328509',
  },
  spsBuild2026: {
    name: 'La Prensa',
    title: 'Inversión inmobiliaria en San Pedro Sula rondaría L25,000 millones (2026)',
    url: 'https://www.laprensa.hn/sanpedro/inversion-inmobiliaria-san-pedro-sula-rondaria-l25-000-millones-CE31063771',
  },
  spsGated: {
    name: 'La Prensa',
    title: 'En auge la compra de casas con circuito cerrado en San Pedro Sula (2019)',
    url: 'https://www.laprensa.hn/honduras/trancas-portones-alcaldia-sanpedrosula-empresasdeseguridad-honduras-FBLP1264760',
  },
  spsFloods: {
    name: 'La Prensa',
    title: 'Casas pierden valor tras las inundaciones de Eta e Iota (2021)',
    url: 'https://www.laprensa.hn/premium/casa-pierden-valor-inundaciones-eta-iota-tormentas-honduras-ME3372248',
  },
  tgcLand2019: {
    name: 'El Heraldo',
    title: 'Colonias del noreste y sur de la capital repuntan en plusvalía (2019)',
    url: 'https://www.elheraldo.hn/tegucigalpa/colonias-del-noreste-y-sur-de-la-capital-repuntan-en-plusvalia-GWEH1309294',
  },
  tgcUpscale: {
    name: 'El Heraldo',
    title: 'La clase alta de la capital ocupa unos 10 sectores (2017)',
    url: 'https://www.elheraldo.hn/tegucigalpa/la-clase-alta-de-la-capital-ocupa-unos-10-sectores-JYEH1056780',
  },
  tgcTowers: {
    name: 'Proceso Digital',
    title: 'Torres residenciales, nueva apuesta de la clase urbana (2018)',
    url: 'https://proceso.hn/torres-residenciales-nueva-apuesta-de-la-emergente-clase-urbana/',
  },
  tgcRisk: {
    name: 'El Heraldo',
    title: 'Cerca de 200 mil personas viven en zonas de alto riesgo en la capital (2024)',
    url: 'https://www.elheraldo.hn/tegucigalpa/cerca-200-mil-personas-viven-zonas-alto-desastres-naturales-GC20554376',
  },
  scamSocial: {
    name: 'La Prensa',
    title: 'Se hacen pasar por dueños y estafan con la venta de casas y terrenos',
    url: 'https://www.laprensa.hn/honduras/honduras-ciberdelitos-venta-casas-terrenos-sector-inmobiliario-OG25453287',
  },
  scamFacebook2025: {
    name: 'La Prensa',
    title: 'Ministerio Público acusa a hombre que engañaba con falsos anuncios en Facebook (2025)',
    url: 'https://www.laprensa.hn/sucesos/ministerio-publico-acusado-estafa-enganaba-victimas-falsos-anuncios-facebook-DG27300157',
  },
  ejidoSale: {
    name: 'El Heraldo',
    title: 'Venden la pista de San Lorenzo, terreno ejidal (2022)',
    url: 'https://www.elheraldo.hn/elheraldoplus/investigaciones/venden-pista-san-lorenzo-valle-DD9621041',
  },
  usLand2026: {
    name: 'TuNota',
    title: 'Invertir en Honduras: las trabas que Estados Unidos pone bajo la lupa (2026)',
    url: 'https://www.tunota.com/mundo/invertir-en-honduras-las-trabas-que-estados-unidos-pone-bajo-la-lupa-2026-09-29',
  },
  ipSure: {
    name: 'El Heraldo',
    title: 'Instituto de la Propiedad agiliza la publicación de imágenes registrales (2026)',
    url: 'https://www.elheraldo.hn/honduras/instituto-propiedad-agiliza-publicacion-imagenes-registrales-herramienta-digital-EO31956453',
  },
} satisfies Record<string, Source>;
