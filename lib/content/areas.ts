import { SOURCES, type Source } from './sources';

/**
 * Сторінки районів. `neighborhoods` — назви з AREA_CENTRES (lib/format.ts), за якими
 * сторінка підтягує живі оголошення з бази. Діапазон цін — лише там, де є джерело.
 */
export type Area = {
  slug: string;
  name: string;
  neighborhoods: string[];
  /** одне речення-відповідь: що це за район і кому він підходить */
  summary: string;
  priceRange: string | null;
  priceSource: Source | null;
  bestFor: string;
  intro: string[];
  highlights: string[];
  considerations: string[];
  faq: { q: string; a: string }[];
};

export const AREAS: Area[] = [
  {
    slug: 'west-bay',
    name: 'West Bay',
    neighborhoods: ['West Bay'],
    summary: 'West Bay is Roatán’s premium beach district: a long white-sand beach with the reef a short swim from shore, lined with resorts, condo buildings and luxury villas.',
    priceRange: '$700K – $2.5M',
    priceSource: SOURCES.latMarket,
    bestFor: 'Luxury buyers, beachfront condos, holiday-rental investors',
    intro: [
      'West Bay sits at the western tip of Roatán and is the image most people have of the island: calm turquoise water, a reef you can snorkel straight from the beach and a strip of resorts and condo complexes behind the sand. It is the most expensive part of the island and the most tourist-oriented.',
      'Most property here is condominium units in managed buildings and villas on the hillside above the beach. Because visitor demand is concentrated here, units are often bought to be rented out by the night when the owner is away.',
    ],
    highlights: [
      'The island’s best-known beach, with reef snorkelling directly from shore.',
      'The strongest holiday-rental demand on the island, driven by resort and cruise-day visitors.',
      'Water taxi and road connection to West End village, a few minutes away.',
      'Many buildings offer on-site rental management, useful for owners who live abroad.',
    ],
    considerations: [
      'Prices per square foot are the highest on Roatán; compare with West End and Sandy Bay before deciding.',
      'Check the HOA fee and what it covers. In condo buildings it often includes security, pool, insurance and beach upkeep.',
      'Beachfront land is scarce. Foreign buyers should read the [3,000 m² rule](/guides/can-foreigners-buy-property-in-roatan) before looking at large lots.',
    ],
    faq: [
      { q: 'How much does a condo in West Bay, Roatán cost?', a: 'West Bay is the most expensive district on Roatán. Analysts at The LatInvestor put typical prices between about $700,000 and $2.5 million, with beachfront units at the top of the range.' },
      { q: 'Is West Bay good for Airbnb investment?', a: 'West Bay has the strongest tourist demand on the island, which is why many condos there are bought as holiday rentals. Island-wide, AirDNA reports 43% average occupancy and about $209 per night, so model your own numbers carefully before buying.' },
    ],
  },
  {
    slug: 'west-end',
    name: 'West End',
    neighborhoods: ['West End', 'Gibson Bight'],
    summary: 'West End is Roatán’s walkable dive village, with restaurants, bars and dive shops along Half Moon Bay; it is the favourite base for expats and divers.',
    priceRange: '$300K – $700K',
    priceSource: SOURCES.latMarket,
    bestFor: 'Expats, divers, buyers who want to live without a car',
    intro: [
      'West End is a small village on the west coast, just north of West Bay. Its single sandy main road is lined with dive shops, cafés, restaurants and small hotels, and Half Moon Bay is the centre of village life. For many people it is the reason they fell in love with Roatán.',
      'Property ranges from condos and small houses in and around the village to hillside homes with sunset views. Subdivisions such as those at Gibson Bight, a few minutes up the coast, offer newer houses at lower prices than the village itself.',
    ],
    highlights: [
      'The island’s main dive hub, with the reef close to shore.',
      'Walkable: daily life without a car is realistic in the village.',
      'An established English-speaking expat community.',
      'Steady demand for both long-term and holiday rentals.',
    ],
    considerations: [
      'The village can be lively at night; hillside and edge-of-village homes are quieter.',
      'Roads up the hills can be steep and unpaved; check access in the rainy season.',
      'Parking and space are limited in the village itself.',
    ],
    faq: [
      { q: 'How much does a house in West End, Roatán cost?', a: 'The LatInvestor puts typical West End prices at roughly $300,000 to $700,000. Newer homes in nearby subdivisions such as Gibson Bight can come in below that range.' },
      { q: 'Can you live in West End, Roatán without a car?', a: 'Yes. West End village is compact and walkable, with shops, restaurants and dive centres along the main road, and water taxis run to West Bay.' },
    ],
  },
  {
    slug: 'sandy-bay',
    name: 'Sandy Bay',
    neighborhoods: ['Sandy Bay'],
    summary: 'Sandy Bay is a quieter residential stretch of the north coast between West End and Coxen Hole, popular with families and retirees who want space without being far from amenities.',
    priceRange: '$250K – $900K',
    priceSource: SOURCES.latMarket,
    bestFor: 'Families, retirees, full-time residents',
    intro: [
      'Sandy Bay lies on the north shore between West End and Coxen Hole. It is greener and calmer than the west end of the island, with homes set along the coast and in the hills behind it, and many full-time residents.',
      'It is about ten to fifteen minutes by road from both West End and the airport, which makes it a practical compromise between village life and access to town services.',
    ],
    highlights: [
      'Quieter and more residential than West End or West Bay.',
      'Wide price range, from modest homes to oceanfront estates.',
      'Close to both West End and the shops, banks and airport around Coxen Hole.',
      'Home to the Roatán Institute for Marine Sciences at Anthony’s Key.',
    ],
    considerations: [
      'Fewer restaurants and shops within walking distance; most residents drive.',
      'Many lots are on hillsides. Ask about slope, road access and water before buying land.',
    ],
    faq: [
      { q: 'Is Sandy Bay a good place to live on Roatán?', a: 'Sandy Bay is popular with families and retirees because it is quieter than the tourist areas but still close to West End and to the services around Coxen Hole and the airport.' },
      { q: 'What do homes in Sandy Bay, Roatán cost?', a: 'The LatInvestor puts Sandy Bay between roughly $250,000 and $900,000, depending on size, view and whether the home is on the water.' },
    ],
  },
  {
    slug: 'coxen-hole',
    name: 'Coxen Hole & Flowers Bay',
    neighborhoods: ['Coxen Hole', 'Flowers Bay'],
    summary: 'Coxen Hole is Roatán’s main town and administrative centre, next to the airport and cruise port; it has the island’s lowest property prices and most local services.',
    priceRange: '$100K – $300K',
    priceSource: SOURCES.latMarket,
    bestFor: 'Budget buyers, Honduran families, people who work on the island',
    intro: [
      'Coxen Hole is the island’s capital and its busiest town, on the south shore close to Juan Manuel Gálvez International Airport (RTB) and one of the cruise terminals. Government offices, banks, supermarkets and most everyday services are here.',
      'Flowers Bay, a little west along the south shore, is a long-established local community with a quieter, more traditional feel. Both areas offer the most affordable homes and lots on Roatán.',
    ],
    highlights: [
      'The lowest entry prices on the island.',
      'Minutes from the airport, banks, government offices and supermarkets.',
      'A good fit for year-round residents rather than holiday visitors.',
    ],
    considerations: [
      'Town traffic is heavy on cruise days.',
      'Lower prices often mean older construction and informal title history, so title checks matter even more here. See [how to check a land title](/guides/how-to-check-land-title-in-roatan).',
    ],
    faq: [
      { q: 'Where is the cheapest property on Roatán?', a: 'The most affordable homes and lots are generally around Coxen Hole and the south shore. The LatInvestor puts the typical range there at about $100,000 to $300,000.' },
      { q: 'How far is Coxen Hole from the airport?', a: 'Coxen Hole is right next to Juan Manuel Gálvez International Airport (RTB), a few minutes by road.' },
    ],
  },
  {
    slug: 'french-harbour',
    name: 'French Harbour & the central coast',
    neighborhoods: ['French Harbour', 'Parrot Tree', 'Palmetto Bay', 'Pristine Bay'],
    summary: 'French Harbour is the commercial hub of central Roatán, with supermarkets, marinas and gated communities such as Parrot Tree and Pristine Bay; it offers good value and full-time infrastructure.',
    priceRange: '$150K – $500K',
    priceSource: SOURCES.latMarket,
    bestFor: 'Year-round residents, boat owners, buyers who want value',
    intro: [
      'French Harbour is a working harbour town in the middle of the island, home to Roatán’s fishing fleet, large supermarkets, hardware stores and marinas. It is where many full-time residents do their shopping, whichever part of the island they live in.',
      'Around it are some of the island’s best-known planned communities: Parrot Tree with its marina, Palmetto Bay on the north shore and Pristine Bay with its golf course. They offer gated, managed living at prices well below West Bay.',
    ],
    highlights: [
      'Central location: roughly halfway between the west end and the quiet east.',
      'Supermarkets, building suppliers and marinas on the doorstep.',
      'Gated communities with docks, security and shared amenities.',
      'Lower prices than the west of the island for comparable homes.',
    ],
    considerations: [
      'Fewer beaches and restaurants than the west end.',
      'Gated communities charge HOA fees and may have their own rules on rentals and building styles.',
    ],
    faq: [
      { q: 'What does property cost in French Harbour, Roatán?', a: 'The LatInvestor puts French Harbour at roughly $150,000 to $500,000, with gated-community homes on the water at the top of that range.' },
      { q: 'Why do people choose French Harbour?', a: 'For its infrastructure and value: it has the island’s main supermarkets, marinas and services, and homes cost less than comparable ones in the west.' },
    ],
  },
  {
    slug: 'oak-ridge',
    name: 'Oak Ridge',
    neighborhoods: ['Oak Ridge'],
    summary: 'Oak Ridge is a traditional fishing town on Roatán’s south-east coast, built around a harbour and mangrove canals, with a slower pace and lower prices than the west.',
    priceRange: null,
    priceSource: null,
    bestFor: 'Buyers seeking quiet, waterfront living and an authentic island town',
    intro: [
      'Oak Ridge is one of the oldest settlements on Roatán, on the south-east coast. Homes on stilts line the harbour, and boats are as common as cars for getting around the mangrove canals.',
      'It is far from the tourist centres of the west, which keeps prices lower and life quieter. Buyers here are usually looking for waterfront homes, docks and a genuine island community rather than resort amenities.',
    ],
    highlights: [
      'Waterfront living with boat access through the mangrove canals.',
      'A traditional island town with a slow pace.',
      'Generally lower prices than the west of the island.',
    ],
    considerations: [
      'About 45 minutes or more by road from West End and the main beaches.',
      'Fewer listings, so compare carefully and expect longer searches.',
      'Waterfront and mangrove areas can carry environmental restrictions; check zoning and permits before buying land.',
    ],
    faq: [
      { q: 'Is Oak Ridge, Roatán a good place to buy?', a: 'Oak Ridge suits buyers who want quiet waterfront living in a traditional island town. It is far from the west-end beaches and tourist services, which keeps it calmer and generally cheaper.' },
    ],
  },
  {
    slug: 'east-end',
    name: 'East End: Punta Gorda & Camp Bay',
    neighborhoods: ['Punta Gorda', 'Camp Bay'],
    summary: 'The East End of Roatán, from Punta Gorda to Camp Bay, is the least developed part of the island, with long quiet beaches, large lots and the most room to build.',
    priceRange: null,
    priceSource: null,
    bestFor: 'Land buyers, off-grid builders, people seeking privacy',
    intro: [
      'East of Oak Ridge the island becomes greener and emptier. Punta Gorda on the north coast is the oldest Garifuna community in Honduras, founded in 1797, and keeps its own culture and festivals. Further east, Camp Bay has one of the longest and quietest beaches on Roatán.',
      'This is where buyers come for land: larger lots, oceanfront parcels and room to build. In return, infrastructure is thinner, so road access, power and water need checking lot by lot.',
    ],
    highlights: [
      'The most land and the largest lots available on Roatán.',
      'Quiet beaches and very little tourist traffic.',
      'Rich Garifuna heritage in Punta Gorda.',
    ],
    considerations: [
      'Roads, electricity and water are not everywhere. Use the [land passport](/land-passport) to see what is confirmed for each lot.',
      'Over an hour by road from West End, with fewer shops and services nearby.',
      'For larger parcels, foreign buyers usually need a Honduran company; see [can foreigners buy property in Roatán](/guides/can-foreigners-buy-property-in-roatan).',
    ],
    faq: [
      { q: 'Where can I buy cheap land on Roatán?', a: 'The East End, from Punta Gorda to Camp Bay, has the most undeveloped land and the largest lots. Check road access, electricity, water and title for each lot before committing.' },
      { q: 'What is Punta Gorda, Roatán known for?', a: 'Punta Gorda is the oldest Garifuna community in Honduras, founded in 1797 on Roatán’s north coast.' },
    ],
  },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);

/** Назва району з бази → сторінка району, щоб картки на головній вели на контент, а не лише на фільтр. */
export const areaForNeighborhood = (name: string) => AREAS.find((a) => a.neighborhoods.includes(name));
