/**
 * Іспанські title і description окремих сторінок, вичитані SEO-редактором (аудит жовтня 2026).
 * Ключ — англійська адреса сторінки. Мають перевагу над автоматичним перекладом у generateMetadata;
 * title — повний, разом із « | Hogarli».
 */
export const ES_META: Record<string, { title?: string; description?: string }> = {
  '/areas/west-bay': {
    description: 'West Bay, la playa premium de Roatán: arena blanca, arrecife junto a la orilla, resorts, condominios y villas de lujo. Precios típicos: $700K – $2.5M.',
  },
  '/areas/west-end': {
    description: 'West End, el pueblo de buceo de Roatán: restaurantes, bares y centros de buceo en Half Moon Bay, favorito de expatriados. Precios típicos: $300K – $700K.',
  },
  '/areas/sandy-bay': {
    description: 'Sandy Bay, zona residencial tranquila de la costa norte entre West End y Coxen Hole, ideal para familias y jubilados. Precios típicos: $250K – $900K.',
  },
  '/areas/coxen-hole': {
    description: 'Coxen Hole, la ciudad principal de Roatán junto al aeropuerto y al puerto de cruceros: los precios más bajos de la isla. Precios típicos: $100K – $300K.',
  },
  '/areas/french-harbour': {
    description: 'French Harbour, centro comercial de Roatán: supermercados, marinas y comunidades cerradas como Parrot Tree y Pristine Bay. Precios típicos: $150K – $500K.',
  },
  '/areas/oak-ridge': {
    description: 'Oak Ridge, pueblo pesquero tradicional del sureste de Roatán, con puerto y canales de manglar, ritmo tranquilo y precios más bajos que en el oeste.',
  },
  '/areas/east-end': {
    description: 'El East End de Roatán, de Punta Gorda a Camp Bay: la zona menos desarrollada, con playas tranquilas, lotes grandes y más espacio para construir.',
  },
  '/areas/san-pedro-sula': {
    description: 'San Pedro Sula, capital industrial de Honduras: colonias cerradas, torres de apartamentos y locales comerciales cerca del aeropuerto más transitado del país.',
  },
  '/areas/tegucigalpa': {
    description: 'Tegucigalpa, la capital de Honduras: casas y apartamentos en colonias como Lomas del Guijarro y Los Próceres, cerca de embajadas, gobierno y empresas.',
  },
  '/guides/can-foreigners-buy-property-in-roatan': {
    title: 'Extranjeros comprando en Roatán: la regla de 3,000 m² | Hogarli',
    description: 'Sí, un extranjero puede ser dueño en Roatán. Cómo funcionan la zona costera, la regla de 3,000 m² del Decreto 90-90 y las sociedades hondureñas en 2026.',
  },
  '/guides/how-to-buy-property-in-roatan': {
    title: 'Cómo comprar una propiedad en Roatán: guía 2026 | Hogarli',
    description: 'El proceso completo para comprar casa, condominio o terreno en Roatán como extranjero: zona, oferta, debida diligencia, escritura, registro y plazos reales.',
  },
  '/guides/roatan-closing-costs': {
    title: 'Gastos de cierre e impuestos en Roatán 2026 | Hogarli',
    description: 'Lo que cuesta comprar en Roatán: impuesto de traspaso del 1.5%, notario, registro, impuesto anual y ganancia de capital, con un ejemplo real.',
  },
  '/guides/how-to-check-land-title-in-roatan': {
    title: 'Cómo revisar el título de un terreno en Roatán | Hogarli',
    description: 'El fraude de títulos es el mayor riesgo al comprar en Roatán. Lista práctica: registro, gravámenes, catastro, vendedor, poderes, impuestos y permisos.',
  },
  '/guides/roatan-rental-income': {
    title: 'Alquiler en Roatán: ocupación Airbnb y rentabilidad 2026 | Hogarli',
    description: 'Números reales del alquiler vacacional en Roatán: 1,002 anuncios activos, 43% de ocupación, tarifa media de $209 y rentabilidad neta del 5–8%.',
  },
  '/guides/best-areas-to-live-in-roatan': {
    title: 'Mejores zonas para vivir en Roatán: barrios y precios | Hogarli',
    description: 'West Bay, West End, Sandy Bay, Coxen Hole, French Harbour, Oak Ridge y East End comparados: para quién es cada zona y cuánto cuesta en 2026.',
  },
  '/developments/duna-tower': {
    description: 'Duna Tower: 33 apartamentos en los pisos 2–9, estudios de 31.1 a 41.6 m², de una habitación (45.7 m²) y de dos (65.5 m²). Desde $107,207 hasta $252,493.',
  },
  '/developments/duna-tower/layouts': {
    description: 'Duna Tower: planos de los apartamentos, tamaños, precio por m² y disponibilidad en Roatán.',
  },
  '/developments/duna-tower/contacts': {
    description: 'Duna Tower: dirección de la sala de ventas, horarios, cómo agendar una visita, el agente y el desarrollador.',
  },
  '/developments/darien-village': {
    description: 'Darien Village: 55 apartamentos en cinco edificios de 5 pisos en Próspera ZEDE (distrito Beta), Roatán, junto a Duna Residences. Diseño de Taller ACÁ.',
  },
  '/developments/darien-village/layouts': {
    description: 'Darien Village: planos de los apartamentos, tamaños, precio por m² y disponibilidad en Roatán.',
  },
  '/developments/darien-village/contacts': {
    description: 'Darien Village: dirección de la sala de ventas, horarios, cómo agendar una visita, el agente y el desarrollador.',
  },
  '/developers/darien-village-development': {
    description: 'Proyectos de Darien Village Development en Roatán: desarrollos, apartamentos disponibles y contacto.',
  },
  '/developers/dionysius-llc': {
    description: 'Proyectos de Dionysius LLC en Roatán: desarrollos, apartamentos disponibles y contacto.',
  },
  '/agents/8bd98151-cd9c-44ea-ad74-6a0a4c3e0fbb': {
    title: 'Edward Korytsky, agente inmobiliario en Roatán | Hogarli',
    description: 'Edward Korytsky, agente inmobiliario en Roatán: anuncios y datos de contacto.',
  },
  '/agents/7fc8ca7d-3984-4086-b0f3-303b94bcc168': {
    title: 'Mesa de anuncios de Hogarli: agente independiente | Hogarli',
    description: 'No somos corredores. Esta cuenta reúne anuncios públicos de agencias de la isla; cada propiedad enlaza a su agencia y las consultas se le reenvían.',
  },
};
