/** Сторінки ЖК і забудовників, валюта, опис оголошення іспанською, назви районів. */
export const ES_DEVELOPMENTS: Record<string, string> = {
  /* ---------- забудовники ---------- */
  'Developers': 'Desarrolladores',
  'Companies building on Roatán.': 'Empresas que construyen en Roatán.',
  'Add your company': 'Agregue su empresa',
  'No developers listed yet.': 'Aún no hay desarrolladores publicados.',
  'since {year}': 'desde {year}',
  '1 development': '1 desarrollo',
  '{n} developments': '{n} desarrollos',
  'Website': 'Sitio web',
  'Phone': 'Teléfono',
  '1 unit': '1 unidad',

  /* ---------- сторінка ЖК: вкладки й заголовки ---------- */
  'Overview': 'Resumen',
  'Construction': 'Construcción',
  'Video & 360°': 'Video y 360°',
  'Video & 360° tour': 'Video y recorrido 360°',
  'Video': 'Video',
  'Contacts': 'Contactos',
  'News': 'Noticias',
  'New development': 'Nuevo desarrollo',
  '{name} sections': 'Secciones de {name}',
  '1 building': '1 edificio',
  '{n} buildings': '{n} edificios',
  'Units': 'Unidades',
  'Types': 'Tipos',
  'Sizes': 'Tamaños',
  'Units & prices': 'Unidades y precios',
  'Prices from the developer’s price list — ask the agent which units are still open.':
    'Precios de la lista del desarrollador: pregunte al agente qué unidades siguen disponibles.',
  'Price list (PDF)': 'Lista de precios (PDF)',
  'Booklet (PDF)': 'Folleto (PDF)',
  'Buildings': 'Edificios',
  'Construction status': 'Estado de la construcción',
  'Availability by floor': 'Disponibilidad por piso',
  'Project features': 'Características del proyecto',
  'As stated by the developer.': 'Según el desarrollador.',
  'All updates': 'Todas las actualizaciones',
  'Walk around {name} without leaving home': 'Recorra {name} sin salir de casa',
  'Terms come from the developer — confirm the current plan with the agent.':
    'Las condiciones son del desarrollador: confirme el plan vigente con el agente.',
  'All {n}': 'Los {n}',
  'Checked': 'Verificado',
  'All news': 'Todas las noticias',
  'Site photos': 'Fotos de la obra',
  'Project by': 'Proyecto de',
  '{n} of {total} open': '{n} de {total} disponibles',
  'Stage {n} of {total}': 'Etapa {n} de {total}',
  'Floor on the left · ST studio, 1BR one bedroom · tap a unit to open it':
    'Piso a la izquierda · E estudio, 1D un dormitorio · toque una unidad para abrirla',
  'No. {n}': 'N.º {n}',
  'issued {date}': 'emitido el {date}',
  'Checked by Hogarli': 'Verificado por Hogarli',
  'Documents are uploaded by the listing agent. Before paying a deposit, have your own Honduran lawyer check the title and permits in the property registry.':
    'Los documentos los sube el agente del anuncio. Antes de pagar un depósito, pida a su propio abogado hondureño que revise el título y los permisos en el registro de la propiedad.',
  '{name} photos': 'Fotos de {name}',
  '{name} — photo {n}': '{name}: foto {n}',
  '360° tour': 'Recorrido 360°',
  'Open the 360° tour': 'Abrir el recorrido 360°',
  'Open the video': 'Abrir el video',
  'No construction photos yet — ask the agent for the latest update.':
    'Aún no hay fotos de la obra: pida al agente la última actualización.',
  '{name} construction, {when}': 'Obra de {name}, {when}',

  /* ---------- характеристики ЖК (підписи з DevelopmentFeatures) ---------- */
  'class': 'categoría',
  'building': 'edificio',
  'buildings': 'edificios',
  'floors': 'pisos',
  'walls': 'paredes',
  'insulation': 'aislamiento',
  'cooling & heating': 'climatización',
  'ceiling height': 'altura del techo',
  'units': 'unidades',
  'finish': 'acabados',
  'grounds': 'áreas exteriores',
  'parking': 'estacionamiento',
  'water supply': 'suministro de agua',
  'HOA fees': 'cuotas de HOA',
  'rentals': 'alquileres',
  'developer': 'desarrollador',
  'completion': 'entrega',
  'type': 'tipo',
  'status': 'estado',

  /* ---------- довідники lib/units ---------- */
  'Unit plan': 'Plano de la unidad',
  'Land title': 'Título del terreno',
  'Construction permit': 'Permiso de construcción',
  'Environmental licence': 'Licencia ambiental',
  'Completion certificate': 'Certificado de finalización de obra',
  'Developer & contractor': 'Desarrollador y contratista',
  'Condominium & HOA': 'Condominio y HOA',
  'Not specified': 'Sin especificar',
  'Short-term rentals allowed': 'Se permiten alquileres de corta estancia',
  'Long-term rentals only': 'Solo alquileres de larga estancia',
  'No rentals': 'No se permiten alquileres',

  /* ---------- валюта ---------- */
  'Prices are stored in US dollars; other currencies are converted at the daily rate.':
    'Los precios se guardan en dólares estadounidenses; las demás monedas se convierten al tipo de cambio del día.',
  '≈ daily rate': '≈ tipo de cambio del día',
  'US dollar': 'Dólar estadounidense',
  'Honduran lempira': 'Lempira hondureño',
  'Canadian dollar': 'Dólar canadiense',
  'Euro': 'Euro',

  /* ---------- опис оголошення ---------- */
  'The agent wrote this description in English.': 'El agente escribió esta descripción en inglés.',
  'The agent wrote this description in Spanish.': 'El agente escribió esta descripción en español.',
  'Translate with Google': 'Traducir con Google',

  /* ---------- райони з довшими назвами ---------- */
  'Coxen Hole & Flowers Bay': 'Coxen Hole y Flowers Bay',
  'French Harbour & the central coast': 'French Harbour y la costa central',
  'East End: Punta Gorda & Camp Bay': 'East End: Punta Gorda y Camp Bay',

  /* ---------- помилки API, які бачить покупець (клієнт показує t(error)) ---------- */
  'Listing not found': 'No se encontró el anuncio',
  'Name and phone are required': 'El nombre y el teléfono son obligatorios',
  'Could not send the enquiry': 'No se pudo enviar la consulta',
  'Development not found': 'No se encontró el desarrollo',
  'Could not book the visit': 'No se pudo reservar la visita',
  'Pick a reason': 'Elija un motivo',
  'Too many reports from this connection. Please try again later.':
    'Demasiados reportes desde esta conexión. Inténtelo de nuevo más tarde.',
  'Reports are not available yet': 'Los reportes aún no están disponibles',
  'Could not send the report': 'No se pudo enviar el reporte',
  'Bad link': 'Enlace no válido',
  'Not found': 'No encontrado',
  'Forbidden': 'Acceso denegado',

  /* ---------- гід для мешканців ---------- */
  'Resident guide': 'Guía para residentes',
  'Duna Tower runs as an aparthotel, Duna Residences, inside Próspera in Crawfish Rock, on Roatán’s north shore. Here is what owners, residents and guests use every day: what is in the building and when, how to reach the team, and what is nearby.':
    'Duna Tower funciona como apartahotel, Duna Residences, dentro de Próspera en Crawfish Rock, en la costa norte de Roatán. Esto es lo que propietarios, residentes y huéspedes usan a diario: qué hay en el edificio y en qué horario, cómo contactar al equipo y qué hay cerca.',
  'Amenities and hours, the front desk, community and what is nearby': 'Servicios y horarios, recepción, comunidad y qué hay cerca',
  'In the building': 'En el edificio',
  'Monday–Friday, 9:00 AM–5:00 PM': 'Lunes a viernes, 9:00 a. m.–5:00 p. m.',
  '2 Cans convenience store': 'Tienda de conveniencia 2 Cans',
  'Level 1': 'Nivel 1',
  'Level 8': 'Nivel 8',
  'Open 24/7': 'Abierto 24/7',
  'Self-checkout; pay with $LIVES or PayPal.': 'Autopago; se paga con $LIVES o PayPal.',
  'Infinity pool': 'Piscina infinita',
  'Quiet hours from 10:00 PM': 'Horas de silencio desde las 10:00 p. m.',
  'Sauna': 'Sauna',
  'Hours are set by the building operator and can change; check with the front desk.':
    'Los horarios los fija el operador del edificio y pueden cambiar; confírmelos en recepción.',
  'Community and news': 'Comunidad y novedades',
  'Residents’ Discord: news, meetups and workshops': 'Discord de residentes: novedades, encuentros y talleres',
  'Próspera spaces, events and services': 'Espacios, eventos y servicios de Próspera',
  'Health and emergencies': 'Salud y emergencias',
  'For a doctor, the building’s guide points residents to Ad Astra Clinic in Próspera.':
    'Para consultas médicas, la guía del edificio recomienda Ad Astra Clinic en Próspera.',
  'In an emergency anywhere in Honduras, call 911.': 'En una emergencia, en cualquier lugar de Honduras, llame al 911.',
  'Around the tower': 'Alrededor de la torre',
  'Local guide': 'Guía local',
  'Beaches, snorkeling, restaurants and day trips within half an hour of the building.':
    'Playas, esnórquel, restaurantes y excursiones a menos de media hora del edificio.',
  'Based on the': 'Basado en la',
  'Duna Residences guidebook': 'guía de Duna Residences',

  /* ---------- інше ---------- */
  'Browse agents & agencies': 'Ver agentes y agencias',
};
