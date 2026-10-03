import { SOURCES, type Source } from './sources';

/**
 * Лендинг /faq за зразком lun.ua/uk/faq: розділи, у кожному — зміст із якорями на питання,
 * далі всі відповіді відкритим текстом. Перше речення відповіді — пряма відповідь,
 * бо саме його цитують Google і AI-асистенти. Текст підтримує `[посилання](/шлях)` і `**жирний**`.
 */
export type HelpItem = { id: string; q: string; a: string[] };
export type HelpSection = {
  id: string;
  icon: string;
  title: string;
  lead: string;
  items: HelpItem[];
  sources?: Source[];
};

export const HELP_UPDATED = '2026-10-03';

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'buying',
    icon: 'home',
    title: 'Buying property on Roatán as a foreigner',
    lead: 'Who can buy, how the purchase works and how long it takes.',
    items: [
      {
        id: 'can-foreigners-buy',
        q: 'Can foreigners buy property on Roatán?',
        a: [
          'Yes. Foreigners can buy and hold full title to homes, condos and land on Roatán. You do not need Honduran residency or a local partner.',
          'Because the whole island lies inside Honduras’s coastal zone, an individual foreign buyer can usually own one property of up to 3,000 m² (about 0.74 acres) for a home. This exception comes from Decree 90-90.',
        ],
      },
      {
        id: '3000-rule',
        q: 'What is the 3,000 m² rule?',
        a: [
          'Article 107 of the Honduran Constitution reserves land within 40 km of the coast for Hondurans. Decree 90-90 lets a foreigner buy one urban or tourism-zone property of up to 3,000 m² to build a private residence. Global Property Guide also notes the commonly cited requirement to build within 36 months.',
          'Condos and most residential lots on Roatán fall well inside the limit.',
        ],
      },
      {
        id: 'larger-lots',
        q: 'What if the lot is bigger than 3,000 m²?',
        a: [
          'Buyers usually form a Honduran company (sociedad) with an attorney. The company then buys and owns the land. This adds set-up and yearly costs, so it only makes sense for larger parcels or developments.',
        ],
      },
      {
        id: 'steps',
        q: 'How does buying property on Roatán work, step by step?',
        a: [
          '1) Set a budget, including 3–7% closing costs. 2) Choose an area and shortlist listings. 3) Agree a price. 4) Sign a purchase agreement (promesa de compraventa) and pay a deposit, usually about 10%, into escrow. 5) Your own attorney checks the title. 6) Sign the deed (escritura) before a Honduran notary and pay the balance. 7) The notary registers the deed at the Instituto de la Propiedad.',
          'The full process is in [how to buy property in Roatán](/guides/how-to-buy-property-in-roatan).',
        ],
      },
      {
        id: 'how-long',
        q: 'How long does a purchase take?',
        a: [
          'A straightforward cash purchase usually closes within one to three months of the offer, depending on the title check and registration. Homes themselves sell slowly: about ten months on average, according to Buying Roatan.',
        ],
      },
      {
        id: 'mortgage',
        q: 'Can I get a mortgage?',
        a: [
          'Mortgages for foreign buyers are rare on Roatán. Most buyers pay cash, use money from selling a home at home, or agree seller financing. On Resoha, listings that offer seller financing can be found with the “Owner financing” filter.',
        ],
      },
      {
        id: 'lawyer',
        q: 'Do I need a lawyer?',
        a: [
          'Yes. The deed must be signed before a Honduran notary, and you should hire your own attorney, not the seller’s, to check the title and handle registration.',
        ],
      },
      {
        id: 'remote',
        q: 'Can I buy without flying to Roatán?',
        a: [
          'Yes. Many buyers view the property on video and sign through a power of attorney given to their attorney or someone they trust. Visiting at least once before you commit is still the safest way.',
        ],
      },
    ],
    sources: [SOURCES.decree9090, SOURCES.gpg, SOURCES.buyingRoatan],
  },
  {
    id: 'costs',
    icon: 'briefcase',
    title: 'Prices, closing costs and taxes',
    lead: 'What property costs on the island and what you pay on top.',
    items: [
      {
        id: 'prices',
        q: 'How much does property cost on Roatán?',
        a: [
          'In mid-2026 the median asking price for a home was about $475,000, and the median sold price about $354,000 (Buying Roatan). Buyers typically negotiate 5–9% off the asking price.',
        ],
      },
      {
        id: 'prices-by-area',
        q: 'Where is it cheaper and where is it more expensive?',
        a: [
          'Prices fall from west to east. Typical ranges from The LatInvestor: West Bay $700K–$2.5M, West End $300K–$700K, Sandy Bay $250K–$900K, French Harbour $150K–$500K and Coxen Hole $100K–$300K. The cheapest land is in the East End.',
          'Compare all areas in [areas of Roatán](/areas).',
        ],
      },
      {
        id: 'closing-costs',
        q: 'What are the closing costs?',
        a: [
          'Buyers usually pay 3–7% of the price, most often 4–5.5%. That covers the 1.5% transfer tax, 1–3% attorney and notary fees, and registration. On a $300,000 home, expect roughly $8,500 to $16,500.',
        ],
      },
      {
        id: 'property-tax',
        q: 'How much is the yearly property tax?',
        a: [
          'About 0.25% a year of the cadastral (official) value, which is often below the market price. A property with a $100,000 cadastral value pays roughly $250 a year.',
        ],
      },
      {
        id: 'commission',
        q: 'Who pays the agent’s commission?',
        a: [
          'The seller. On Roatán the commission is commonly about 10% of the price.',
        ],
      },
      {
        id: 'capital-gains',
        q: 'What tax do I pay when I sell?',
        a: [
          'Capital gains tax in Honduras is 10% of the profit. Keep your deed and receipts for improvements so you can prove your costs.',
        ],
      },
    ],
    sources: [SOURCES.buyingRoatan, SOURCES.latMarket, SOURCES.latTaxes, SOURCES.figueroa],
  },
  {
    id: 'land',
    icon: 'deed',
    title: 'Land, title and the land passport',
    lead: 'How to make sure the land is really for sale and ready to build on.',
    items: [
      {
        id: 'check-title',
        q: 'How do I check that a title is clean?',
        a: [
          'Have your own attorney pull the registered title and a lien certificate (certificado de libertad de gravamen) from the Instituto de la Propiedad. They should also match the cadastral survey to the lot, confirm the seller’s identity and check that municipal taxes are paid. Never pay a deposit before this is done.',
        ],
      },
      {
        id: 'scams',
        q: 'What are the most common scams?',
        a: [
          'Forged powers of attorney (poder), fake sellers and land with competing claims, according to The LatInvestor. If someone sells on the owner’s behalf, verify the power of attorney directly with the notary who issued it.',
        ],
      },
      {
        id: 'possession',
        q: 'What is the difference between title and “possession rights”?',
        a: [
          'Registered title is recorded at the Instituto de la Propiedad. Possession rights (derechos posesorios) are not, and turning them into title takes time and is not guaranteed. Treat land sold with possession rights only as higher risk.',
        ],
      },
      {
        id: 'land-passport',
        q: 'What is the Resoha land passport?',
        a: [
          'A standard checklist on every land listing: title, road access, electricity, water, survey, ZOLITUR building permit, zone and slope. Each item is marked confirmed or not, with the date and the person who checked it. You can download it as a PDF and send it to your attorney.',
          'More on the [land passport page](/land-passport).',
        ],
      },
      {
        id: 'ready-to-build',
        q: 'What does “Ready to build” mean?',
        a: [
          'All four core facts are confirmed: registered free-and-clear title, road access, electricity at or near the lot, and water. Two or three of them give “Needs work”; fewer give “Raw land”. [See ready-to-build land](/listings?type=land&ready=1).',
        ],
      },
      {
        id: 'passport-vs-lawyer',
        q: 'Does the land passport replace a lawyer?',
        a: [
          'No. It shows what has been confirmed about a lot and when, so you can compare land quickly. Your own attorney still checks the title before you pay anything.',
        ],
      },
      {
        id: 'zolitur',
        q: 'What is ZOLITUR?',
        a: [
          'ZOLITUR is the tourism free-zone authority of the Bay Islands. It issues building permits on the islands, so ask whether a permit has been granted or what it will take before you buy land to build on.',
        ],
      },
    ],
    sources: [SOURCES.latRisks],
  },
  {
    id: 'renting',
    icon: 'key',
    title: 'Renting out and investing',
    lead: 'Honest numbers for buyers who plan to rent the property out.',
    items: [
      {
        id: 'airbnb',
        q: 'Is a holiday rental on Roatán profitable?',
        a: [
          'It can be. AirDNA reports 1,002 active short-term rentals on the island, with 43% average occupancy at about $209 a night. That is roughly $32,800 a year in gross revenue for a typical listing. Local agents quote net yields of about 5–8% after costs.',
        ],
      },
      {
        id: 'best-area-rentals',
        q: 'Which area rents best?',
        a: [
          'West Bay and West End have the strongest tourist demand and the highest nightly rates. The east of the island rents less often.',
        ],
      },
      {
        id: 'season',
        q: 'When is high season?',
        a: [
          'Roughly December to April, when North Americans travel south. Direct flights connect Roatán with Miami, Houston, Atlanta, Dallas, Denver, Minneapolis, Toronto and Montreal.',
        ],
      },
      {
        id: 'rental-check',
        q: 'What should I check before buying to rent out?',
        a: [
          'Ask for real booking history, not projections. Check that the building or community allows short-term rentals and what its rental programme charges. Budget for management, often 20–30% of revenue. Details are in [Roatán rental income](/guides/roatan-rental-income).',
        ],
      },
    ],
    sources: [SOURCES.airdna, SOURCES.flights],
  },
  {
    id: 'service',
    icon: 'island',
    title: 'How Resoha works',
    lead: 'What the site is, where the listings come from and what it costs.',
    items: [
      {
        id: 'buy-on-resoha',
        q: 'Can I buy a property on Resoha?',
        a: [
          'Resoha is a listing platform, not a broker. You find a property here and contact the listing agent directly by WhatsApp, phone or the enquiry form. The viewing, the negotiation and the sale happen with the agent and your attorney.',
        ],
      },
      {
        id: 'sell-on-resoha',
        q: 'Can I sell my property on Resoha?',
        a: [
          'Listings are published by island agencies and agents. If you are an owner, ask your agent to list on Resoha. If you are an agent, [create a free agent account](/for-agents).',
        ],
      },
      {
        id: 'what-listed',
        q: 'What is listed on Resoha?',
        a: [
          'Homes, condos, commercial property and land for sale, plus long-term rentals, across the whole island: from West Bay and West End to French Harbour, Oak Ridge and Camp Bay.',
        ],
      },
      {
        id: 'where-info',
        q: 'Where does the information come from?',
        a: [
          'From the island agency or agent who holds each listing. Every listing shows its source and links back to the original, so you can see who published the details.',
        ],
      },
      {
        id: 'free',
        q: 'Is it true that listing on Resoha is free?',
        a: [
          'Yes. Agents publish listings for free, and buyers pay nothing to search, save listings or contact agents. Resoha takes no commission from buyers.',
        ],
      },
      {
        id: 'prices-shown',
        q: 'Are prices shown?',
        a: [
          'Yes. Every listing shows its price in US dollars, and rentals show the monthly rent. Condos also show the HOA fee when the agent provides it.',
        ],
      },
      {
        id: 'photos',
        q: 'Where do the photos come from?',
        a: [
          'From the agencies and agents themselves. We do not use stock photos: if a listing has no real photos yet, it says so.',
        ],
      },
      {
        id: 'outdated',
        q: 'What about sold or outdated listings?',
        a: [
          'Agents can pause or remove listings at any time, and listings stay linked to the agent responsible for them. If something looks out of date, tell us through the enquiry form on the listing.',
        ],
      },
      {
        id: 'contact-agent',
        q: 'How do I contact an agent?',
        a: [
          'Open a listing and tap WhatsApp or Call, or send the enquiry form. Your message goes straight to the agent who holds the property. With a free buyer account you can also save listings and searches.',
        ],
      },
    ],
  },
];

export const HELP_ITEMS = HELP_SECTIONS.flatMap((s) => s.items);
