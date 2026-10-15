import type { Block } from './guides';
import { SOURCES, type Source } from './sources';

/**
 * Блог: живіші тексти, ніж гайди. Гайд відповідає на одне питання й оновлюється;
 * стаття — розбір теми з датою, рубрикою й порадами, на які можна послатися в соцмережах.
 * Текст підтримує ту саму розмітку, що й гайди (components/Rich), іспанський переклад —
 * у lib/i18n/es/blog.ts, ключ — англійський рядок.
 */
export type Topic = 'buying' | 'new-builds' | 'living' | 'market';

export const TOPICS: { slug: Topic; name: string; blurb: string; icon: 'deed' | 'crane' | 'island' | 'chart' }[] = [
  { slug: 'buying', name: 'Buying', blurb: 'How to buy safely: offers, checks, attorneys and the traps to avoid.', icon: 'deed' },
  { slug: 'new-builds', name: 'New builds', blurb: 'Buying off-plan and in new developments: contracts, payments and handover.', icon: 'crane' },
  { slug: 'living', name: 'Living in Honduras', blurb: 'Renting, moving and owning a home on the islands and in the cities.', icon: 'island' },
  { slug: 'market', name: 'Market', blurb: 'Where to buy and why: cities, areas and how the market works.', icon: 'chart' },
];

export const topicBySlug = (slug: string) => TOPICS.find((t) => t.slug === slug);

export type Post = {
  slug: string;
  title: string;
  description: string;
  topic: Topic;
  /** іконка на обкладинці; без неї — іконка рубрики */
  icon?: string;
  published: string;
  updated: string;
  /** вступ під заголовком, 2–3 речення */
  lead: string;
  takeaways: string[];
  sections: { h: string; body: Block[] }[];
  sources: Source[];
  /** інші статті */
  related: string[];
  /** гайди з lib/content/guides.ts */
  guides: string[];
};

const DISCLAIMER = 'This article is general information, not legal, tax or engineering advice. Confirm every step with a Honduran attorney and, for buildings, a qualified engineer before you pay a deposit.';

export const POSTS: Post[] = [
  {
    slug: 'buying-off-plan-in-honduras-questions-for-the-developer',
    title: 'Buying off-plan in Honduras: 10 questions to ask the developer before you sign',
    description: 'Pre-construction condos can be the best value in Honduras, or the costliest mistake. Ten questions about title, permits, payments, delays and handover to ask any developer first.',
    topic: 'new-builds',
    icon: 'crane',
    published: '2026-10-15',
    updated: '2026-10-15',
    lead: 'Buying a condo before it is built usually gets you a lower price and the pick of the units. It also means paying for something that does not exist yet. These ten questions separate a serious developer from a risky one, and every answer should be backed by a document, not a promise.',
    takeaways: [
      'Check that the land is titled to the developer or the project company, free of liens, before you pay anything.',
      'Tie each payment to a construction milestone you can see, and keep deposits in escrow where possible.',
      'Get the finishes, the delivery date and the penalty for delay written into the contract.',
      'Ask how and when you will receive your own registered title, not just the keys.',
    ],
    sections: [
      {
        h: 'Why off-plan, and why be careful',
        body: [
          'Developers in Roatán, San Pedro Sula and Tegucigalpa often sell the first units of a project at launch prices, before construction starts, to fund the build. Early buyers get the best views and floors at the lowest price. The trade-off is that your money goes into a project that can be delayed, changed or, in the worst case, never finished.',
          'Honduras has no national deposit-protection scheme for off-plan buyers, so your protection is the contract and the checks you run before signing. Browse current projects on [Hogarli developments](/developments), where each project shows its construction progress, documents and sales office.',
        ],
      },
      {
        h: 'Questions about the developer and the land',
        body: [
          { list: [
            '**1. What have you built before?** Ask for addresses of finished projects and visit one. Talk to owners there about build quality, delays and how the homeowners’ association is run.',
            '**2. Who owns the land?** The land should be registered to the developer or the project company at the Instituto de la Propiedad, free of mortgages and liens. Your attorney pulls the certificate; see [how to check a land title](/guides/how-to-check-land-title-in-roatan).',
            '**3. Which permits do you have?** A municipal building permit is the minimum. On the Bay Islands, construction also needs ZOLITUR approval and an environmental licence. Ask for copies, not a verbal yes.',
          ], ordered: false },
        ],
      },
      {
        h: 'Questions about money',
        body: [
          { list: [
            '**4. What is the payment schedule?** A fair schedule ties instalments to milestones you can verify, such as foundations, structure, roof and handover, rather than to calendar dates alone.',
            '**5. Where does my deposit go?** Ask whether deposits are held in escrow or a separate project account. Paying straight into a personal account is a red flag.',
            '**6. What happens if the project is delayed or cancelled?** The contract should name a delivery date, a grace period, a penalty for late delivery and a refund if the project does not go ahead.',
          ] },
          { note: 'Ask the developer for the draft contract before you pay a reservation fee, and have your own attorney, not the developer’s, read it.' },
        ],
      },
      {
        h: 'Questions about the unit and the building',
        body: [
          { list: [
            '**7. What exactly am I buying?** The contract should attach the floor plan, the area in square metres, the parking space and a schedule of finishes: floors, kitchen, windows, air conditioning. “Similar quality” is not a specification.',
            '**8. What will the HOA fees be?** Ask for the estimated monthly fee, what it covers and who runs the association. On the islands, a backup generator and water storage are worth paying for.',
            '**9. Can I rent the unit out?** If you plan to earn rental income, check that the building rules allow short-term rentals and whether the developer runs a rental programme.',
          ] },
        ],
      },
      {
        h: 'The question most buyers forget',
        body: [
          '**10. How and when do I get my title?** Keys are not ownership. Ask when the building will be registered as a condominium, when your unit gets its own entry at the property registry, and who pays for the deed and registration. Closing costs are explained in [Roatán closing costs](/guides/roatan-closing-costs).',
          'A good developer answers all ten questions without hesitation and puts the answers in writing. If you get vague replies, pressure to pay a deposit today or a contract that you cannot take to your own lawyer, walk away. There will be another launch.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.latRisks, SOURCES.gpg],
    related: ['how-to-spot-property-scams-in-honduras', 'roatan-san-pedro-sula-or-tegucigalpa'],
    guides: ['how-to-buy-property-in-roatan', 'how-to-check-land-title-in-roatan'],
  },
  {
    slug: 'how-to-spot-property-scams-in-honduras',
    title: 'How to spot a fake listing or property scam in Honduras',
    description: 'The warning signs of fake listings, rental scams and fraudulent sellers in Honduras, and the simple checks that protect your deposit.',
    topic: 'buying',
    icon: 'flag',
    published: '2026-10-15',
    updated: '2026-10-15',
    lead: 'Most property in Honduras is sold honestly, but the scams that do happen follow the same few patterns: a price that is too good, a seller who cannot meet you and a deposit that has to be sent today. Here is how to recognise them and the checks that make them fail.',
    takeaways: [
      'Never send a deposit for a property you or someone you trust has not seen in person or on a live video call.',
      'The person selling must be the registered owner, or hold a power of attorney your own attorney has verified.',
      'Pay into escrow or an attorney’s trust account, never by gift card, crypto or a personal transfer abroad.',
      'Urgency is the scammer’s main tool. A real seller will wait for your checks.',
    ],
    sections: [
      {
        h: 'The five most common scams',
        body: [
          { list: [
            '**The copied listing.** Photos and text are lifted from a real listing and reposted at a lower price with a different phone number. The scammer asks for a “reservation fee” to hold the property.',
            '**The rental deposit.** A furnished apartment at a very good monthly rent, an owner who is “abroad” and a request for the first month and deposit before you can see it. The keys never arrive.',
            '**The false owner.** Someone sells land they do not own, sometimes with forged papers or an old power of attorney that has been revoked.',
            '**The double sale.** The same lot is sold to two buyers. The one who registers the deed first usually keeps it.',
            '**The undisclosed debt.** The property is real and the owner is real, but there is a mortgage, a lien or unpaid municipal tax that becomes your problem after closing.',
          ] },
        ],
      },
      {
        h: 'Red flags to watch for',
        body: [
          { list: [
            'The price is far below similar properties in the same area. Compare with [current listings](/listings?deal=sale) and the [market report](/market).',
            'The seller or landlord cannot meet you or show the property, and will not do a live video call from inside it.',
            'You are pushed to pay today because “another buyer is interested”.',
            'Payment is requested by wire to a personal account abroad, by money transfer service, gift card or cryptocurrency.',
            'The seller avoids your attorney, or insists that you use theirs.',
            'The names on the documents do not match the person you are talking to.',
          ] },
        ],
      },
      {
        h: 'Checks that stop almost every scam',
        body: [
          'None of these checks is expensive, and together they close the door on every scam above:',
          { list: [
            'Hire your own Honduran attorney and notary. Their job is to protect you, not to close the sale.',
            'Have the attorney pull the title and lien certificate from the Instituto de la Propiedad and confirm the seller is the registered owner. The steps are in [how to check a land title](/guides/how-to-check-land-title-in-roatan).',
            'If someone signs on the owner’s behalf, have the power of attorney (poder) verified with the notary who issued it.',
            'Match the cadastral survey to the lot you were shown, on the ground.',
            'Pay the deposit into escrow or your attorney’s trust account, against a signed purchase agreement.',
            'Register the deed as soon as it is signed. Registration, not the signature, is what protects you from a double sale.',
          ], ordered: true },
        ],
      },
      {
        h: 'Renting? The same rules, scaled down',
        body: [
          'For a long-term rental, see the place before you pay, or send someone you trust. Ask for the owner’s ID and proof that they own or manage the property, sign a written lease (contrato de arrendamiento) and pay by a traceable method. Take dated photos of the condition on move-in. Our [guide to renting before you buy](/blog/renting-in-honduras-before-you-buy) covers the rest.',
        ],
      },
      {
        h: 'How Hogarli helps',
        body: [
          'Every listing on Hogarli links back to the agency or agent that holds it, so you can see who you are dealing with and read their reviews on [agent profiles](/agents). Land listings carry a [land passport](/land-passport) that shows which facts have been confirmed and when. If something on a listing looks wrong, use the **Report listing** button on the listing page and our moderators will check it.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.latRisks, SOURCES.gpg],
    related: ['buying-off-plan-in-honduras-questions-for-the-developer', 'renting-in-honduras-before-you-buy'],
    guides: ['how-to-check-land-title-in-roatan', 'how-to-buy-property-in-roatan'],
  },
  {
    slug: 'roatan-san-pedro-sula-or-tegucigalpa',
    title: 'Roatán, San Pedro Sula or Tegucigalpa: where to buy property in Honduras',
    description: 'Island, business capital or political capital? How Roatán, San Pedro Sula and Tegucigalpa compare for buyers: who buys there, what you get, rental demand and what to check.',
    topic: 'market',
    icon: 'map',
    published: '2026-10-15',
    updated: '2026-10-15',
    lead: 'Hogarli lists property in three very different places. Roatán is a Caribbean island priced in dollars for foreign buyers. San Pedro Sula is the country’s business engine. Tegucigalpa is the capital in the mountains. Which one fits depends far more on why you are buying than on price.',
    takeaways: [
      'Roatán: lifestyle, retirement and holiday-rental buyers; prices mostly in US dollars.',
      'San Pedro Sula: business owners and families; apartments, gated colonias and commercial space near the main airport.',
      'Tegucigalpa: professionals, diplomats and NGO staff; strong long-term rental demand in the south-east colonias.',
      'Wherever you buy, the same title check at the Instituto de la Propiedad applies.',
    ],
    sections: [
      {
        h: 'At a glance',
        body: [
          { table: {
            head: ['', 'Roatán', 'San Pedro Sula', 'Tegucigalpa'],
            rows: [
              ['What it is', 'Caribbean island, Bay Islands', 'Industrial and business capital', 'Capital, seat of government'],
              ['Typical buyers', 'Foreign retirees, holiday-home and rental investors', 'Honduran families, business owners', 'Professionals, diplomats, NGO staff'],
              ['Typical property', 'Beach condos, villas, land', 'Houses in gated colonias, apartments, commercial', 'Apartment towers, hillside houses'],
              ['Rental demand', 'Tourists, short-term', 'Professionals, long-term', 'Embassy and corporate staff, long-term'],
              ['Main airport', 'Roatán (RTB)', 'Ramón Villeda Morales (SAP)', 'Palmerola (XPL), about an hour away'],
              ['Foreign ownership', 'Coastal zone: 3,000 m² rule', 'Generally outside the coastal strip', 'Outside the coastal strip'],
            ],
          } },
        ],
      },
      {
        h: 'Roatán: lifestyle first',
        body: [
          'Roatán sells a way of life: reef, beaches and a large English-speaking community. Most listings are priced in US dollars and many buyers pay cash. The island has its own rules for foreign buyers because it lies in the coastal zone; read [can foreigners buy property in Roatán](/guides/can-foreigners-buy-property-in-roatan).',
          'If you plan to rent out, tourism and cruise traffic drive short-term demand, which is concentrated in West Bay and West End. Read the [rental income guide](/guides/roatan-rental-income) for realistic numbers, and compare areas in [best areas to live in Roatán](/guides/best-areas-to-live-in-roatan).',
        ],
      },
      {
        h: 'San Pedro Sula: the business case',
        body: [
          'San Pedro Sula sits in the Sula Valley, close to Puerto Cortés and with the busiest international airport in Honduras. Demand comes from people who work there, so long-term rentals and apartments near the business districts are the core of the market. Flat valley land makes access and building simpler than on the islands.',
          'The main thing to check is flooding: parts of the valley flooded badly during Eta and Iota in November 2020. Ask how a property came through those storms. More on [San Pedro Sula areas](/areas/san-pedro-sula).',
        ],
      },
      {
        h: 'Tegucigalpa: the capital in the hills',
        body: [
          'Tegucigalpa sits in a mountain valley at about 1,000 m, so the climate is milder than on the coast. Government, embassies and international organisations create steady demand for secure apartments in colonias such as Lomas del Guijarro and Los Próceres. Most international flights use Palmerola near Comayagua.',
          'Check the commute (streets are steep and traffic is heavy), the stability of hillside lots in the rainy season, and whether the building has a cistern, because mains water is irregular in parts of the city. More on [Tegucigalpa areas](/areas/tegucigalpa).',
        ],
      },
      {
        h: 'How to decide',
        body: [
          { list: [
            '**You want a home by the sea or a holiday rental**: start on Roatán.',
            '**You want long-term tenants or a base for business on the north coast**: look at San Pedro Sula.',
            '**You work in the capital, or rent to people who do**: look at Tegucigalpa.',
          ] },
          'Whichever you choose, visit at different times of day, rent first if you are moving, and have your own attorney check the title before paying anything. You can filter [all listings](/listings?deal=sale) by city on the map.',
        ],
      },
    ],
    sources: [SOURCES.buyingRoatan, SOURCES.gpg, SOURCES.decree9090, SOURCES.nhcEta, SOURCES.nhcIota],
    related: ['hurricane-season-and-property-on-the-bay-islands', 'renting-in-honduras-before-you-buy'],
    guides: ['best-areas-to-live-in-roatan', 'can-foreigners-buy-property-in-roatan'],
  },
  {
    slug: 'hurricane-season-and-property-on-the-bay-islands',
    title: 'Hurricane season and your property: what to check before you buy in Honduras',
    description: 'The Atlantic hurricane season runs from June to November. What it means for property on Roatán and the mainland, and the building, site and insurance checks to make before buying.',
    topic: 'living',
    icon: 'wave',
    published: '2026-10-15',
    updated: '2026-10-15',
    lead: 'Roatán sits south of the main hurricane track and direct hits are rare, but Honduras has lived through Mitch in 1998 and Eta and Iota in 2020. The risk is manageable if you buy a well-built house on the right site. Here is what to look at.',
    takeaways: [
      'The Atlantic hurricane season runs from 1 June to 30 November, with the peak from August to October.',
      'On the islands, wind and storm surge are the main risks; in the Sula Valley and on hillsides, it is flooding and landslides.',
      'Elevation, roof structure, openings and drainage matter more than the view.',
      'Ask how the property came through past storms, and get insurance quotes before you close.',
    ],
    sections: [
      {
        h: 'How big is the risk?',
        body: [
          'The Atlantic hurricane season officially runs from 1 June to 30 November, according to the [National Hurricane Center](https://www.nhc.noaa.gov/climo/). Most storms that reach the western Caribbean pass north of the Bay Islands, so in a typical year Roatán sees heavy rain and wind rather than a direct hit.',
          'The exceptions are memorable. Hurricane Mitch in October 1998 stalled near the Bay Islands, battered Guanaja and caused catastrophic flooding on the mainland. In November 2020, Eta and Iota struck within two weeks of each other and flooded large parts of the Sula Valley around San Pedro Sula. Both are documented in the National Hurricane Center’s storm reports.',
        ],
      },
      {
        h: 'On the islands: wind, surge and water',
        body: [
          { list: [
            '**Elevation and setback.** A house a few metres above sea level and set back from the shore is far safer from storm surge than one on the beach line. Ask for the height above sea level on the survey.',
            '**Structure.** Reinforced concrete and block walls, a roof tied down to the walls with hurricane straps, and a roof shape that does not catch the wind.',
            '**Openings.** Impact-rated windows or proper storm shutters for every opening, including sliding doors.',
            '**Water and power.** A cistern, a backup generator and a way to keep them running for a week. After a storm, utilities can take days to come back.',
            '**Trees and docks.** Large trees close to the house and wooden docks are the first things to go.',
          ] },
        ],
      },
      {
        h: 'On the mainland: flooding and landslides',
        body: [
          'In San Pedro Sula the question is water, not wind. Parts of the valley floor flooded for days in 2020. Ask neighbours and the agent where the water reached, check the street drainage and look at the ground floor walls for old water lines.',
          'In Tegucigalpa, some hillside colonias have a history of landslides in heavy rain. Look at retaining walls, cracks and drainage, and have an engineer check a hillside lot before buying.',
        ],
      },
      {
        h: 'Questions to ask the seller or developer',
        body: [
          { list: [
            'How did the property come through Eta and Iota in 2020, and any storm since?',
            'Has the roof been replaced or reinforced, and when?',
            'Are there shutters or impact windows for every opening?',
            'Is the property insured today, and with whom?',
            'For new builds: which engineer designed the structure, and to which wind standard?',
          ] },
        ],
      },
      {
        h: 'Insurance and timing',
        body: [
          'Property insurance with windstorm cover is available in Honduras, but terms vary widely and some policies exclude older or beachfront buildings. Get quotes from local brokers before closing, not after. If you are buying a house that will sit empty part of the year, arrange a caretaker who will secure it before a storm.',
          'Many buyers visit in the dry season, roughly from February to May. Try to see the property after heavy rain too: it is the quickest way to learn how it drains.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.nhcClimo, SOURCES.nhcMitch, SOURCES.nhcEta, SOURCES.nhcIota],
    related: ['roatan-san-pedro-sula-or-tegucigalpa', 'buying-off-plan-in-honduras-questions-for-the-developer'],
    guides: ['best-areas-to-live-in-roatan', 'how-to-buy-property-in-roatan'],
  },
  {
    slug: 'renting-in-honduras-before-you-buy',
    title: 'Rent first, buy later: a practical guide to renting in Honduras',
    description: 'Why renting for a few months is the smartest first step before buying in Honduras, and how to find a place, read the lease, handle utilities and avoid the common mistakes.',
    topic: 'living',
    icon: 'key',
    published: '2026-10-15',
    updated: '2026-10-15',
    lead: 'The most common piece of advice from people who bought in Honduras is the same: rent first. A few months in a rented home show you which area suits you, what daily life costs and which agents you trust, before you commit to a purchase.',
    takeaways: [
      'Rent for three to six months, ideally through both the dry and the rainy season.',
      'Always sign a written lease and see the property, or have someone you trust see it, before you pay.',
      'Clarify who pays electricity, water, internet and HOA fees, and how the deposit is returned.',
      'Use the time to visit every area on your shortlist at different times of day.',
    ],
    sections: [
      {
        h: 'Why rent first',
        body: [
          'An area that looks perfect on a holiday can feel different in the rainy season, at rush hour or when the cruise ships are in. Renting lets you test the commute, the noise, the internet, the water supply and the neighbours. It also gives you time to meet agents in person and watch the market, so that when you buy, you know what a fair price looks like.',
        ],
      },
      {
        h: 'Where to look',
        body: [
          'Start with [long-term rentals on Hogarli](/listings?deal=rent), where you can filter by city, area, bedrooms and price on the map and contact the agent directly by WhatsApp. On Roatán, West End and Sandy Bay have the widest choice of long-term rentals; in the cities, look at the colonias near where you will work. Save a search and you will get an email when something new matches.',
        ],
      },
      {
        h: 'What to check before you sign',
        body: [
          { list: [
            '**Who is renting it to you.** Ask for the owner’s ID, or the agency’s authority to manage the property.',
            '**The lease.** A written contrato de arrendamiento with the rent, the term, the deposit, the notice period and what happens if either side leaves early.',
            '**The deposit.** Agree in writing how much it is and when and how it will be returned.',
            '**Furnished or not.** Attach an inventory with photos to the lease.',
            '**Utilities.** On Roatán, electricity is supplied by RECO and is a large part of monthly costs if you run air conditioning; on the mainland, it comes from ENEE. Ask for recent bills.',
            '**Water and backup.** Is there a cistern, a pump and a generator? Who maintains them?',
            '**Internet.** Ask which provider serves the building and test the speed during your viewing.',
          ] },
        ],
      },
      {
        h: 'Mistakes to avoid',
        body: [
          { list: [
            'Paying a deposit for a place you have not seen. See [how to spot a property scam](/blog/how-to-spot-property-scams-in-honduras).',
            'Signing a one-year lease when you only want to test an area. Ask for three or six months, even at a higher rent.',
            'Leaving without photos of the condition on move-in and move-out.',
            'Judging an island area only in the dry season.',
          ] },
        ],
      },
      {
        h: 'From renting to buying',
        body: [
          'Keep a list as you go: what you like about the area, what you would change, and which agents answered quickly and honestly. When you are ready, read [how to buy property in Roatán](/guides/how-to-buy-property-in-roatan) and set up a saved search for homes [for sale](/listings?deal=sale) in the areas you now know.',
        ],
      },
    ],
    sources: [SOURCES.gpg],
    related: ['how-to-spot-property-scams-in-honduras', 'roatan-san-pedro-sula-or-tegucigalpa'],
    guides: ['best-areas-to-live-in-roatan', 'how-to-buy-property-in-roatan'],
  },
];

/** Новіші — першими. */
export const POSTS_SORTED = [...POSTS].sort((a, b) => b.published.localeCompare(a.published) || POSTS.indexOf(a) - POSTS.indexOf(b));

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);

/** Хвилини читання: ~220 слів на хвилину, рахуємо весь видимий текст статті. */
export function readingMinutes(p: Post): number {
  const text = (b: Block): string => typeof b === 'string' ? b
    : 'note' in b ? b.note
    : 'list' in b ? b.list.join(' ')
    : [...b.table.head, ...b.table.rows.flat()].join(' ');
  const all = [p.lead, ...p.takeaways, ...p.sections.flatMap((s) => [s.h, ...s.body.map(text)])].join(' ');
  return Math.max(1, Math.round(all.split(/\s+/).filter(Boolean).length / 220));
}
