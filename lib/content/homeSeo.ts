import type { Lang } from '@/lib/i18n';

/**
 * Довгий SEO-текст унизу головної, схований за «Read more». Лежить у HTML завжди
 * (<details>), тож пошуковики бачать його повністю. Посилання — розмітка Rich: `[текст](/шлях)`.
 * Факти (податки, правило 3 000 м²) — ті самі, що в гайдах; міняєш там — міняй і тут.
 */
export type SeoBlock =
  | { h: string }
  | { p: string }
  | { list: string[] }
  | { faq: { q: string; a: string }[] };

export type HomeSeo = {
  title: string;
  titleTail: string;
  lead: string;
  more: string;
  less: string;
  body: SeoBlock[];
};

const EN: HomeSeo = {
  title: 'Hogarli: Real Estate in Honduras,',
  titleTail: 'Homes, Condos, Land & New Developments',
  lead: 'Hogarli brings the Honduran property market into one catalogue: [homes and condos for sale](/listings?deal=sale), [long-term and holiday rentals](/listings?deal=rent), [land and building lots](/listings?type=land), [commercial property](/listings?type=commercial) and [new developments straight from the developer](/developments). Listings from local agencies in Roatán, San Pedro Sula and Tegucigalpa, checked, organised by city and neighbourhood, and updated every day.',
  more: 'Read more',
  less: 'Show less',
  body: [
    { p: 'Pick your city, choose your area, and find the right property.' },

    { h: 'What Makes Hogarli Different?' },
    { p: 'Most property sites in Honduras are either a single agency’s website or a classifieds board where the same house appears five times at five different prices. Hogarli is built differently: one listing per property, a clear link to the agency that holds it, and facts you can check before you fly in.' },
    { list: [
      '**One catalogue, three cities.** [Roatán](/areas/west-bay), [San Pedro Sula](/areas/san-pedro-sula) and [Tegucigalpa](/areas/tegucigalpa) in one search, with filters by city, neighbourhood, price, bedrooms and property type.',
      '**Every listing has an owner.** Each property links back to the licensed agency or agent who publishes it, so you always know who you are talking to.',
      '**[Land passport](/land-passport).** Lots and land listings show which facts are confirmed: title, road access, power and water, and when they were last checked.',
      '**[New developments](/developments) from the developer.** Condo towers and gated communities with floor plans, unit availability, stage of construction and completion dates.',
      '**[Developer pages](/developers).** Every developer has its own page with all of its projects, so you can see the track record behind a building before you reserve a unit.',
      '**[Market data](/market).** Price statistics by city and area, updated from live listings, so you know what a fair price looks like.',
      '**English and Spanish.** The whole site works in both languages, with prices shown in US dollars or lempiras.',
    ] },

    { h: 'Property for Sale in Roatán, San Pedro Sula and Tegucigalpa' },
    { p: 'Honduras is not one property market but several. A beach condo on the Bay Islands, a family house in a gated colonia of San Pedro Sula and an apartment near the embassies in Tegucigalpa are bought by different people, for different reasons, at very different prices. Hogarli keeps each city separate, so the search results always match the market you are looking at.' },

    { h: 'Roatán: Beach Homes, Condos and Island Living' },
    { p: 'Roatán is the largest of the Bay Islands and the main destination for foreign buyers in Honduras. The Mesoamerican Barrier Reef runs along its coast, there are direct flights from the United States and Canada, and the island has a large community of expats, retirees and holiday-home owners. Most listings are condos, villas and residential lots, and many owners rent their homes to visitors when they are away.' },
    { list: [
      '**[West Bay](/areas/west-bay).** The island’s premium beach: white sand, the reef a short swim from shore, resorts and luxury condos.',
      '**[West End](/areas/west-end).** A walkable dive village with restaurants and bars along Half Moon Bay, popular with expats and divers.',
      '**[Sandy Bay](/areas/sandy-bay).** A quieter residential stretch of the north coast, liked by families and retirees.',
      '**[Coxen Hole](/areas/coxen-hole).** The main town next to the airport and cruise port, with the lowest prices on the island.',
      '**[French Harbour](/areas/french-harbour).** The commercial centre of the island, with marinas, supermarkets and gated communities.',
      '**[Oak Ridge](/areas/oak-ridge) and the [East End](/areas/east-end).** Fishing villages, mangrove canals, long quiet beaches and the largest lots.',
    ] },
    { p: 'Not sure where to start? Our guide to the [best areas to live in Roatán](/guides/best-areas-to-live-in-roatan) compares every neighbourhood by price, lifestyle and rental demand.' },

    { h: 'San Pedro Sula: Apartments and Houses in the Business Capital' },
    { p: '[San Pedro Sula](/areas/san-pedro-sula) is the industrial and business capital of Honduras and home to the country’s busiest international airport. Buyers here are mostly families and professionals looking for a safe, modern home close to work. The market is built around gated residenciales, new apartment towers in the north-west of the city and commercial space along the main boulevards.' },
    { p: 'Popular areas include Colonia Trejo, Los Álamos, Río de Piedras, Jardines del Valle, Sector Mackay, Boulevard Mario Catarino Rivas and the new communities of Ciudad Jaraguá and Ciudad Maya. Many of the city’s [new developments](/developments) are sold off-plan, with payment plans during construction.' },

    { h: 'Tegucigalpa: Homes and Condos in the Capital' },
    { p: '[Tegucigalpa](/areas/tegucigalpa) is the capital of Honduras and the seat of government, embassies and international organisations. Most buyers look in the hillside colonias of the south-east: Lomas del Guijarro, Los Próceres, Lomas del Mayab, Miraflores, Residencial La Cumbre and the area around Boulevard Morazán. Here you find condo towers with views over the valley, townhouses in gated communities and family houses with gardens.' },

    { h: 'Types of Property on Hogarli' },
    { p: 'Every listing in the catalogue has a type, so you can narrow the search in one click and compare like with like.' },
    { list: [
      '**[Condos and apartments](/listings?deal=sale&type=condo).** From studios to penthouses, in beachfront buildings, city towers and gated communities. Condos are the easiest way for a foreigner to buy in Honduras.',
      '**[Houses and villas](/listings?deal=sale&type=house).** Family homes in residenciales, island villas with pools and ocean views, and townhouses.',
      '**[Land and building lots](/listings?type=land).** Residential lots, ocean-view parcels and larger plots for development, each with a land passport.',
      '**[Commercial property](/listings?type=commercial).** Shops, offices, warehouses and buildings with an income, mostly in San Pedro Sula and Tegucigalpa.',
      '**[Rentals](/listings?deal=rent).** Long-term rentals for people moving to Honduras, and furnished homes for a season.',
    ] },

    { h: 'New Developments and Developers in Honduras' },
    { p: 'The [new developments section](/developments) lists condo towers, residential communities and mixed-use projects across all three cities. Each project page shows the developer, location on the map, buildings, floor plans, available units with prices, construction stage and expected completion. You can subscribe to a project and the sales office will email you news, price changes and new releases.' },
    { p: 'Behind every project there is a company. The [developers directory](/developers) collects the builders active in Roatán, San Pedro Sula and Tegucigalpa, from family firms that have built gated colonias for decades to the groups behind the newest towers. Each developer page lists all of its projects in one place.' },
    { p: 'Buying off-plan usually means a reservation deposit, a payment schedule during construction and the balance at delivery. Prices before completion are often lower than for finished units, but the risk is higher, so check the developer’s history, the building permits and who holds the deposit.' },

    { h: 'How to Choose the Right Property' },
    { p: 'The catalogue has thousands of listings, and the right choice depends on a few key questions: why you are buying, where you want to be, and how much paperwork you are ready to check.' },

    { h: 'Price, Area and Market Data' },
    { p: 'Start with the area, not the house. Prices in Honduras change a lot from one neighbourhood to the next: a two-bedroom condo in West Bay can cost several times more than a similar one in French Harbour or Coxen Hole. Our [areas comparison](/areas) and [market report](/market) show typical prices per city and area, so you can see quickly whether a listing is priced in line with the market.' },

    { h: 'Title, Land and the Land Passport' },
    { p: 'In Honduras, the most important thing to check is the title. Before you pay a deposit, your attorney should confirm at the Instituto de la Propiedad that the seller is the registered owner, that there are no liens, and that the size on the survey matches the listing. Read our guide on [how to check a land title](/guides/how-to-check-land-title-in-roatan) for the full checklist.' },
    { p: 'For land, Hogarli adds a [land passport](/land-passport) to the listing: a short card that shows whether the title, road access, electricity and water have been confirmed, and when. It does not replace an attorney, but it tells you at a glance which questions are already answered.' },

    { h: 'Buying Property in Honduras as a Foreigner' },
    { p: 'Yes, [foreigners can buy property in Honduras](/guides/can-foreigners-buy-property-in-roatan) with full title, and you do not need residency to do it. The Honduran Constitution restricts foreign ownership within 40 km of the coast and borders, which covers all of the Bay Islands, but Decree 90-90 makes an exception: a foreign individual can buy one property of up to 3,000 m² for a private residence. Condos and most residential lots fall well inside that limit. Larger parcels are usually bought through a Honduran company.' },
    { p: 'The usual steps are: choose a property, sign a purchase agreement with a deposit, let your attorney check the title, sign the deed before a notary, pay the transfer tax and register the property. Our step-by-step guide on [how to buy property in Roatán](/guides/how-to-buy-property-in-roatan) walks through each stage.' },

    { h: 'Closing Costs and Property Taxes' },
    { p: 'Budget about 3–7% of the price for [closing costs](/guides/roatan-closing-costs). The main items are the 1.5% transfer tax and 1–3% in attorney and notary fees, plus small registration charges. Annual property tax is low, about 0.25% of the cadastral value, and the seller usually pays the agent’s commission. When you sell, capital gains tax is 10% of the profit.' },

    { h: 'Rentals and Investment Property' },
    { p: 'Many buyers on Roatán pay part of the cost of a holiday home by renting it to visitors. Occupancy and income depend heavily on the location, the view and how the property is managed. Our guide to [Roatán rental income](/guides/roatan-rental-income) shows realistic occupancy rates and yields. In San Pedro Sula and Tegucigalpa, long-term rentals to professionals and families are the more common investment.' },
    { p: 'Moving to Honduras and not ready to buy? Browse [long-term rentals](/listings?deal=rent) to live in an area first, then buy when you know it.' },

    { h: 'Saved Searches, Alerts and Viewings' },
    { p: 'Good properties sell fast. Save a search and Hogarli will email you when a new listing matches it. Save your favourite homes, compare them side by side, and book a viewing directly with the agency. If you are abroad, many agencies offer video tours before you travel.' },

    { h: 'For Agents, Agencies and Developers' },
    { p: 'Hogarli is a listing platform, not a broker. Agencies and independent agents [publish listings for free](/for-agents), receive enquiries from local and foreign buyers, and see views and leads in their own dashboard. Developers can claim their company page, add projects with buildings, floor plans and unit availability, and keep prices and status up to date themselves.' },

    { h: 'Hogarli on Mobile' },
    { p: 'Hogarli works on any phone, tablet or computer, with no app to install. The mobile version has the same catalogue, filters, maps and saved searches as the desktop. Same account, same favourites, wherever you are.' },

    { h: 'Frequently Asked Questions' },
    { p: 'Answers to common questions about buying, renting and searching for property in Honduras. More in our [FAQ](/faq) and [buying guides](/guides).' },
    { faq: [
      { q: 'What property can I find on Hogarli?', a: 'Hogarli lists [condos and apartments](/listings?deal=sale&type=condo), [houses and villas](/listings?deal=sale&type=house), [land](/listings?type=land), [commercial property](/listings?type=commercial), [rentals](/listings?deal=rent) and [new developments](/developments) in Roatán, San Pedro Sula and Tegucigalpa.' },
      { q: 'Can foreigners buy property in Honduras?', a: 'Yes. Foreigners can own property with full title and do not need residency. In coastal areas such as Roatán, an individual can usually own up to 3,000 m² for a residence; larger parcels are bought through a Honduran company. [Read the full guide](/guides/can-foreigners-buy-property-in-roatan).' },
      { q: 'Is Hogarli a real-estate agency?', a: 'No. Hogarli is a listing platform. Each property is published by the agency or developer that holds it, and you contact them directly through the listing.' },
      { q: 'How much are closing costs in Honduras?', a: 'Usually 3–7% of the price: 1.5% transfer tax, 1–3% attorney and notary fees, and registration. [See the breakdown](/guides/roatan-closing-costs).' },
      { q: 'What is the land passport?', a: 'A card on land listings that shows whether the title, road, power and water have been confirmed and when. [How it works](/land-passport).' },
      { q: 'Can I see prices in lempiras?', a: 'Yes. Switch the currency in the site menu to see every price in US dollars or Honduran lempiras.' },
    ] },
  ],
};

const ES: HomeSeo = {
  title: 'Hogarli: Bienes Raíces en Honduras,',
  titleTail: 'Casas, Apartamentos, Terrenos y Proyectos Nuevos',
  lead: 'Hogarli reúne el mercado inmobiliario de Honduras en un solo catálogo: [casas y apartamentos en venta](/listings?deal=sale), [alquileres a largo plazo y de temporada](/listings?deal=rent), [terrenos y lotes](/listings?type=land), [locales comerciales](/listings?type=commercial) y [proyectos nuevos directamente del desarrollador](/developments). Anuncios de agencias locales en Roatán, San Pedro Sula y Tegucigalpa, verificados, ordenados por ciudad y colonia y actualizados cada día.',
  more: 'Leer más',
  less: 'Mostrar menos',
  body: [
    { p: 'Elija su ciudad, su zona y encuentre la propiedad adecuada.' },

    { h: '¿Qué hace diferente a Hogarli?' },
    { p: 'La mayoría de los sitios inmobiliarios de Honduras son la web de una sola agencia o un tablero de clasificados donde la misma casa aparece cinco veces con cinco precios distintos. Hogarli funciona de otra manera: un anuncio por propiedad, un enlace claro a la agencia que la ofrece y datos que puede verificar antes de viajar.' },
    { list: [
      '**Un catálogo, tres ciudades.** [Roatán](/areas/west-bay), [San Pedro Sula](/areas/san-pedro-sula) y [Tegucigalpa](/areas/tegucigalpa) en una sola búsqueda, con filtros por ciudad, colonia, precio, habitaciones y tipo de propiedad.',
      '**Cada anuncio tiene un responsable.** Cada propiedad enlaza con la agencia o el agente que la publica, así siempre sabe con quién habla.',
      '**[Pasaporte del terreno](/land-passport).** Los terrenos muestran qué datos están confirmados: título, acceso por calle, luz y agua, y cuándo se verificaron.',
      '**[Proyectos nuevos](/developments) del desarrollador.** Torres de apartamentos y residenciales con planos, disponibilidad de unidades, etapa de obra y fecha de entrega.',
      '**[Páginas de desarrolladores](/developers).** Cada constructora tiene su página con todos sus proyectos, para conocer su trayectoria antes de reservar.',
      '**[Datos del mercado](/market).** Estadísticas de precios por ciudad y zona, calculadas con anuncios reales, para saber cuál es un precio justo.',
      '**Español e inglés.** Todo el sitio funciona en ambos idiomas, con precios en dólares o en lempiras.',
    ] },

    { h: 'Propiedades en venta en Roatán, San Pedro Sula y Tegucigalpa' },
    { p: 'Honduras no es un solo mercado inmobiliario, sino varios. Un apartamento frente al mar en las Islas de la Bahía, una casa familiar en una colonia cerrada de San Pedro Sula y un apartamento cerca de las embajadas en Tegucigalpa los compran personas distintas, por motivos distintos y a precios muy distintos. Hogarli separa cada ciudad para que los resultados siempre correspondan al mercado que le interesa.' },

    { h: 'Roatán: casas de playa, condominios y vida en la isla' },
    { p: 'Roatán es la mayor de las Islas de la Bahía y el principal destino de los compradores extranjeros en Honduras. El Arrecife Mesoamericano bordea su costa, hay vuelos directos desde Estados Unidos y Canadá, y la isla tiene una gran comunidad de extranjeros, jubilados y dueños de casas vacacionales. La mayoría de los anuncios son condominios, villas y lotes residenciales, y muchos propietarios alquilan su casa a turistas cuando no la usan.' },
    { list: [
      '**[West Bay](/areas/west-bay).** La playa más exclusiva de la isla: arena blanca, el arrecife a pocos metros, resorts y condominios de lujo.',
      '**[West End](/areas/west-end).** Un pueblo de buceo para recorrer a pie, con restaurantes y bares en Half Moon Bay, muy popular entre extranjeros y buzos.',
      '**[Sandy Bay](/areas/sandy-bay).** Una zona residencial más tranquila de la costa norte, preferida por familias y jubilados.',
      '**[Coxen Hole](/areas/coxen-hole).** El pueblo principal junto al aeropuerto y el puerto de cruceros, con los precios más bajos de la isla.',
      '**[French Harbour](/areas/french-harbour).** El centro comercial de la isla, con marinas, supermercados y residenciales cerrados.',
      '**[Oak Ridge](/areas/oak-ridge) y el [East End](/areas/east-end).** Pueblos de pescadores, canales de manglar, playas tranquilas y los lotes más grandes.',
    ] },
    { p: '¿No sabe por dónde empezar? Nuestra guía de las [mejores zonas para vivir en Roatán](/guides/best-areas-to-live-in-roatan) compara cada zona por precio, estilo de vida y demanda de alquiler.' },

    { h: 'San Pedro Sula: apartamentos y casas en la capital industrial' },
    { p: '[San Pedro Sula](/areas/san-pedro-sula) es la capital industrial y de negocios de Honduras y tiene el aeropuerto internacional con más tráfico del país. Aquí compran sobre todo familias y profesionales que buscan una vivienda moderna y segura cerca del trabajo. El mercado se centra en residenciales cerrados, nuevas torres de apartamentos en el noroeste de la ciudad y locales comerciales sobre los bulevares principales.' },
    { p: 'Entre las zonas más buscadas están Colonia Trejo, Los Álamos, Río de Piedras, Jardines del Valle, Sector Mackay, el Bulevar Mario Catarino Rivas y las nuevas comunidades de Ciudad Jaraguá y Ciudad Maya. Muchos de los [proyectos nuevos](/developments) de la ciudad se venden en preventa, con planes de pago durante la construcción.' },

    { h: 'Tegucigalpa: casas y apartamentos en la capital' },
    { p: '[Tegucigalpa](/areas/tegucigalpa) es la capital de Honduras y sede del gobierno, las embajadas y los organismos internacionales. La mayoría de los compradores buscan en las colonias del sureste: Lomas del Guijarro, Los Próceres, Lomas del Mayab, Miraflores, Residencial La Cumbre y los alrededores del Bulevar Morazán. Aquí hay torres de apartamentos con vista al valle, townhouses en residenciales cerrados y casas familiares con jardín.' },

    { h: 'Tipos de propiedad en Hogarli' },
    { p: 'Cada anuncio del catálogo tiene un tipo, así puede filtrar con un clic y comparar opciones similares.' },
    { list: [
      '**[Apartamentos y condominios](/listings?deal=sale&type=condo).** Desde estudios hasta penthouses, en edificios frente al mar, torres urbanas y residenciales. Es la forma más sencilla de comprar para un extranjero.',
      '**[Casas y villas](/listings?deal=sale&type=house).** Casas familiares en residenciales, villas en la isla con piscina y vista al mar, y townhouses.',
      '**[Terrenos y lotes](/listings?type=land).** Lotes residenciales, terrenos con vista al mar y parcelas grandes para desarrollar, cada uno con su pasaporte del terreno.',
      '**[Locales comerciales](/listings?type=commercial).** Locales, oficinas, bodegas y edificios con renta, sobre todo en San Pedro Sula y Tegucigalpa.',
      '**[Alquileres](/listings?deal=rent).** Alquileres a largo plazo para quienes se mudan a Honduras y casas amuebladas por temporada.',
    ] },

    { h: 'Proyectos nuevos y desarrolladores en Honduras' },
    { p: 'La [sección de proyectos nuevos](/developments) reúne torres de apartamentos, residenciales y proyectos de uso mixto en las tres ciudades. Cada proyecto muestra el desarrollador, la ubicación en el mapa, los edificios, los planos, las unidades disponibles con precios, la etapa de obra y la fecha de entrega prevista. Puede suscribirse a un proyecto y la oficina de ventas le enviará por correo novedades, cambios de precio y nuevas unidades.' },
    { p: 'Detrás de cada proyecto hay una empresa. El [directorio de desarrolladores](/developers) reúne a las constructoras que trabajan en Roatán, San Pedro Sula y Tegucigalpa, desde empresas familiares que llevan décadas construyendo residenciales hasta los grupos detrás de las torres más nuevas. Cada página de desarrollador muestra todos sus proyectos en un solo lugar.' },
    { p: 'Comprar en preventa suele implicar una reserva, un plan de pagos durante la obra y el saldo a la entrega. El precio antes de terminar suele ser menor, pero el riesgo es mayor: revise la trayectoria del desarrollador, los permisos de construcción y quién custodia el depósito.' },

    { h: 'Cómo elegir la propiedad adecuada' },
    { p: 'El catálogo tiene miles de anuncios, y la elección correcta depende de algunas preguntas clave: para qué compra, dónde quiere estar y cuánta documentación está dispuesto a revisar.' },

    { h: 'Precio, zona y datos del mercado' },
    { p: 'Empiece por la zona, no por la casa. Los precios en Honduras cambian mucho de una colonia a otra: un apartamento de dos habitaciones en West Bay puede costar varias veces más que uno similar en French Harbour o Coxen Hole. Nuestra [comparación de zonas](/areas) y el [informe del mercado](/market) muestran los precios típicos por ciudad y zona, para ver rápido si un anuncio está en línea con el mercado.' },

    { h: 'Título, terreno y pasaporte del terreno' },
    { p: 'En Honduras, lo más importante es revisar el título. Antes de pagar una reserva, su abogado debe confirmar en el Instituto de la Propiedad que el vendedor es el dueño registrado, que no hay gravámenes y que el área del plano coincide con el anuncio. Lea nuestra guía sobre [cómo revisar el título de un terreno](/guides/how-to-check-land-title-in-roatan) para ver la lista completa.' },
    { p: 'En los terrenos, Hogarli añade un [pasaporte del terreno](/land-passport): una ficha que muestra si el título, el acceso por calle, la luz y el agua están confirmados, y desde cuándo. No sustituye a un abogado, pero indica de un vistazo qué preguntas ya tienen respuesta.' },

    { h: 'Comprar propiedad en Honduras siendo extranjero' },
    { p: 'Sí, [los extranjeros pueden comprar propiedad en Honduras](/guides/can-foreigners-buy-property-in-roatan) con título pleno y sin necesidad de residencia. La Constitución restringe la propiedad extranjera a menos de 40 km de las costas y fronteras, lo que abarca todas las Islas de la Bahía, pero el Decreto 90-90 hace una excepción: una persona extranjera puede comprar una propiedad de hasta 3,000 m² para vivienda. Los apartamentos y la mayoría de los lotes residenciales quedan muy por debajo de ese límite. Las parcelas más grandes se compran normalmente mediante una sociedad hondureña.' },
    { p: 'Los pasos habituales son: elegir la propiedad, firmar una promesa de compraventa con depósito, que su abogado revise el título, firmar la escritura ante notario, pagar el impuesto de tradición e inscribir la propiedad. Nuestra guía paso a paso sobre [cómo comprar propiedad en Roatán](/guides/how-to-buy-property-in-roatan) explica cada etapa.' },

    { h: 'Gastos de cierre e impuestos' },
    { p: 'Reserve entre el 3 % y el 7 % del precio para los [gastos de cierre](/guides/roatan-closing-costs). Los principales son el impuesto de tradición del 1.5 % y del 1 % al 3 % en honorarios de abogado y notario, más pequeños cargos de registro. El impuesto anual sobre bienes inmuebles es bajo, cerca del 0.25 % del valor catastral, y la comisión del agente normalmente la paga el vendedor. Al vender, la ganancia de capital tributa un 10 %.' },

    { h: 'Alquileres e inversión' },
    { p: 'Muchos compradores en Roatán cubren parte del costo de su casa vacacional alquilándola a turistas. La ocupación y los ingresos dependen mucho de la ubicación, la vista y la administración. Nuestra guía sobre [ingresos por alquiler en Roatán](/guides/roatan-rental-income) muestra ocupaciones y rentabilidades realistas. En San Pedro Sula y Tegucigalpa, la inversión más común es el alquiler a largo plazo a profesionales y familias.' },
    { p: '¿Se muda a Honduras y aún no quiere comprar? Vea los [alquileres a largo plazo](/listings?deal=rent), viva primero en la zona y compre cuando la conozca.' },

    { h: 'Búsquedas guardadas, alertas y visitas' },
    { p: 'Las buenas propiedades se venden rápido. Guarde una búsqueda y Hogarli le enviará un correo cuando aparezca un anuncio que coincida. Guarde sus favoritos, compárelos lado a lado y agende una visita directamente con la agencia. Si está en el extranjero, muchas agencias ofrecen recorridos por video antes de viajar.' },

    { h: 'Para agentes, agencias y desarrolladores' },
    { p: 'Hogarli es una plataforma de anuncios, no un corredor. Las agencias y los agentes independientes [publican gratis](/for-agents), reciben consultas de compradores locales y extranjeros y ven las visitas y los contactos en su propio panel. Los desarrolladores pueden reclamar la página de su empresa, añadir proyectos con edificios, planos y disponibilidad, y mantener precios y estado al día por su cuenta.' },

    { h: 'Hogarli en el móvil' },
    { p: 'Hogarli funciona en cualquier teléfono, tableta o computadora, sin instalar nada. La versión móvil tiene el mismo catálogo, filtros, mapas y búsquedas guardadas que la de escritorio. La misma cuenta y los mismos favoritos, esté donde esté.' },

    { h: 'Preguntas frecuentes' },
    { p: 'Respuestas a preguntas comunes sobre comprar, alquilar y buscar propiedad en Honduras. Más en nuestras [preguntas frecuentes](/faq) y [guías de compra](/guides).' },
    { faq: [
      { q: '¿Qué propiedades encuentro en Hogarli?', a: 'Hogarli publica [apartamentos](/listings?deal=sale&type=condo), [casas y villas](/listings?deal=sale&type=house), [terrenos](/listings?type=land), [locales comerciales](/listings?type=commercial), [alquileres](/listings?deal=rent) y [proyectos nuevos](/developments) en Roatán, San Pedro Sula y Tegucigalpa.' },
      { q: '¿Pueden los extranjeros comprar propiedad en Honduras?', a: 'Sí. Los extranjeros pueden tener título pleno y no necesitan residencia. En zonas costeras como Roatán, una persona puede tener hasta 3,000 m² para vivienda; las parcelas más grandes se compran mediante una sociedad hondureña. [Lea la guía completa](/guides/can-foreigners-buy-property-in-roatan).' },
      { q: '¿Hogarli es una agencia inmobiliaria?', a: 'No. Hogarli es una plataforma de anuncios. Cada propiedad la publica la agencia o el desarrollador que la ofrece, y usted los contacta directamente desde el anuncio.' },
      { q: '¿Cuánto cuestan los gastos de cierre en Honduras?', a: 'Normalmente entre el 3 % y el 7 % del precio: 1.5 % de impuesto de tradición, 1–3 % de abogado y notario, y el registro. [Vea el desglose](/guides/roatan-closing-costs).' },
      { q: '¿Qué es el pasaporte del terreno?', a: 'Una ficha en los anuncios de terrenos que muestra si el título, la calle, la luz y el agua están confirmados y desde cuándo. [Cómo funciona](/land-passport).' },
      { q: '¿Puedo ver los precios en lempiras?', a: 'Sí. Cambie la moneda en el menú del sitio para ver todos los precios en dólares o en lempiras.' },
    ] },
  ],
};

export const homeSeo = (lang: Lang): HomeSeo => (lang === 'es' ? ES : EN);
