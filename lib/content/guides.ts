import { SOURCES, type Source } from './sources';

/**
 * Гайди для покупців. Кожен відкривається прямою відповіддю на питання із заголовка:
 * саме цей абзац підхоплюють і сніпети Google, і відповіді ChatGPT/Perplexity.
 * Текст підтримує `[посилання](/шлях)` і `**жирний**` (components/Rich).
 */
export type Block =
  | string
  | { list: string[]; ordered?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string };

export type Guide = {
  slug: string;
  title: string;
  /** коротка назва для карток і хлібних крихт */
  short: string;
  description: string;
  published: string;
  updated: string;
  /** пряма відповідь, 2–3 речення */
  answer: string;
  keyFacts: string[];
  sections: { h: string; body: Block[] }[];
  faq: { q: string; a: string }[];
  sources: Source[];
  related: string[];
};

const DISCLAIMER = 'This guide is general information, not legal or tax advice. Rules and fees change; confirm every step with a Honduran attorney (abogado y notario) before you pay a deposit.';

export const GUIDES: Guide[] = [
  {
    slug: 'can-foreigners-buy-property-in-roatan',
    title: 'Can foreigners buy property in Roatán? The 3,000 m² rule explained',
    short: 'Can foreigners buy property?',
    description: 'Yes, foreigners can own property on Roatán. Here is how the coastal-zone restriction, the 3,000 m² rule under Decree 90-90 and Honduran companies work in 2026.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'Yes. Foreigners can buy and hold full title to property on Roatán. Because the island lies inside Honduras’s coastal zone, an individual foreign buyer can usually own up to 3,000 m² (about 0.74 acres) for a home under Decree 90-90; larger parcels are normally bought through a Honduran company.',
    keyFacts: [
      'The Honduran Constitution (Article 107) restricts foreign ownership within 40 km of the coast and borders, which covers all of the Bay Islands.',
      'Decree 90-90 makes an exception: a foreigner may buy one urban or tourism-zone property of up to 3,000 m² for a private residence.',
      'Condos are bought the same way as houses and normally fall well inside the limit.',
      'For land larger than 3,000 m², buyers usually set up a Honduran corporation (sociedad) that owns the property.',
    ],
    sections: [
      {
        h: 'Why there is a limit at all',
        body: [
          'Article 107 of the Honduran Constitution reserves land within 40 kilometres of the coasts and international borders for Hondurans. Every part of Roatán, Utila and Guanaja is inside that band, so without an exception no foreigner could buy there.',
          'The exception is [Decree 90-90](https://www.tsc.gob.hn/web/leyes/Ley%20para%20la%20Adquisicion%20de%20Bienes%20Urbanos%20en%20las%20Areas%20que...%20%28Decreto%2090-90%29%20%2808%29.pdf), the law on acquiring urban property in the areas defined by Article 107. It lets foreigners buy property in those zones for housing and tourism, within limits.',
        ],
      },
      {
        h: 'What the 3,000 m² rule means in practice',
        body: [
          'Under Decree 90-90, an individual foreigner can acquire one property of up to 3,000 square metres to build a private residence. Global Property Guide also notes the commonly cited requirement to build within 36 months of purchase. In practice:',
          { list: [
            '**Condos and townhouses**: no practical issue. The unit and its share of common land are far below 3,000 m².',
            '**A house on a normal lot**: most residential lots on Roatán are smaller than 3,000 m² (roughly 32,000 ft²), so they can be titled in your own name.',
            '**Large lots and acreage**: anything above the limit is usually bought by a Honduran company that you own.',
          ] },
        ],
      },
      {
        h: 'Buying through a Honduran company',
        body: [
          'A Honduran corporation can hold more land than an individual foreigner. Foreign buyers commonly form a company with an attorney, register it, and the company then buys and holds title. This adds set-up and yearly costs (bookkeeping, filings), so it only makes sense for larger parcels or developments.',
          { note: 'Ask your attorney to explain the yearly obligations of the company before you form it, and who will handle them while you are abroad.' },
        ],
      },
      {
        h: 'What foreign buyers should check first',
        body: [
          { list: [
            'That the seller is the registered owner, or holds a valid power of attorney (poder) you have verified independently.',
            'The size of the lot on the cadastral survey, so you know whether it falls under the 3,000 m² limit.',
            'The full title history and any liens at the Instituto de la Propiedad. See [how to check a land title on Roatán](/guides/how-to-check-land-title-in-roatan).',
            'Zoning and building permits from ZOLITUR, the Bay Islands tourism free zone authority, if you plan to build.',
          ] },
          'On Resoha, land listings carry a [land passport](/land-passport) that shows which of these facts have been confirmed and when.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'Can Americans buy property in Roatán?', a: 'Yes. US, Canadian and other foreign citizens can own property on Roatán with full title. An individual can usually own up to 3,000 m² for a residence under Decree 90-90; larger parcels are normally held through a Honduran company.' },
      { q: 'Do I need residency to buy property in Honduras?', a: 'No. You do not need Honduran residency to buy property on Roatán. You will need a valid passport and, in practice, a Honduran attorney and notary to handle the purchase.' },
      { q: 'Can a foreigner buy beachfront property on Roatán?', a: 'Yes, within the same limit: an individual foreigner can own a beachfront property of up to 3,000 m² for a residence. Beachfront condos are bought the same way as any other unit.' },
      { q: 'What happens if the lot is bigger than 3,000 m²?', a: 'Buyers usually form a Honduran corporation, which then buys and owns the land. Your attorney sets up and registers the company before the purchase.' },
    ],
    sources: [SOURCES.decree9090, SOURCES.gpg, SOURCES.latRisks],
    related: ['how-to-buy-property-in-roatan', 'how-to-check-land-title-in-roatan', 'roatan-closing-costs'],
  },
  {
    slug: 'how-to-buy-property-in-roatan',
    title: 'How to buy property in Roatán: step-by-step guide for 2026',
    short: 'How to buy, step by step',
    description: 'The full process of buying a home, condo or land on Roatán as a foreigner: choosing an area, the offer, due diligence, the deed, registration and realistic timelines.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'Buying property on Roatán takes seven steps: set a budget, shortlist areas and listings, make an offer, sign a purchase agreement with a deposit, run due diligence on the title, sign the deed before a Honduran notary, and register it at the Instituto de la Propiedad. Most foreign buyers pay cash, and a straightforward purchase typically closes in one to three months after the offer.',
    keyFacts: [
      'There is no single MLS on Roatán. Listings are spread across agency websites and Facebook groups.',
      'Agents on Roatán do not need a licence, so checking who you deal with matters.',
      'Mortgages for foreigners are rare; most buyers pay cash or use seller financing.',
      'Budget 3–7% on top of the price for taxes and fees (most deals land at 4–5.5%).',
    ],
    sections: [
      {
        h: '1. Set a realistic budget',
        body: [
          'Start from what the market actually charges. The median asking price for a home on Roatán was about $475,000 in mid-2026, while the median sold price was about $354,000, according to [Buying Roatan](https://buyingroatan.com/blog/buying-a-home-in-roatan-june-2026-market-summary/). Buyers typically negotiate 5–9% off the asking price.',
          'Add closing costs of 3–7% (see [Roatán closing costs](/guides/roatan-closing-costs)) and, for a condo, the monthly HOA fee.',
        ],
      },
      {
        h: '2. Choose an area',
        body: [
          'The island changes a lot from west to east. West Bay and West End are the tourist and expat centres; Sandy Bay is residential; Coxen Hole and French Harbour are the working towns; the East End is where the land is. Compare them in our [guide to Roatán neighbourhoods](/guides/best-areas-to-live-in-roatan) or browse [area pages](/areas).',
        ],
      },
      {
        h: '3. Shortlist listings and agents',
        body: [
          'Because there is no MLS, the same property can appear at different prices on different sites, and sold homes often stay online. On [Resoha](/listings?deal=sale), every listing links back to the island agency that holds it, so you can see where the details came from.',
          'Ask any agent how long they have worked on the island, which agency they belong to and for references from past buyers. Read reviews on their [Resoha profile](/agents).',
        ],
      },
      {
        h: '4. Offer and purchase agreement',
        body: [
          'Once the price is agreed, your attorney or the seller’s prepares a purchase agreement, often a promise of sale (promesa de compraventa), that sets the price, the deposit, the closing date and the conditions, including a clean title. Deposits are usually around 10% and should be held in escrow, not paid straight to the seller.',
        ],
      },
      {
        h: '5. Due diligence',
        body: [
          'This is the step that protects your money. Your own attorney, not the seller’s, should:',
          { list: [
            'Pull the title and lien certificate from the Instituto de la Propiedad.',
            'Confirm the seller’s identity, or verify any power of attorney (poder) independently.',
            'Match the cadastral survey to the lot you were shown.',
            'Check that municipal property taxes are paid up.',
            'For land, confirm road access, utilities, zoning and ZOLITUR permits.',
          ] },
          'Read [how to check a land title on Roatán](/guides/how-to-check-land-title-in-roatan) for the details.',
        ],
      },
      {
        h: '6. Sign the deed',
        body: [
          'The sale is completed when buyer and seller sign the public deed (escritura pública) before a Honduran notary and the balance is paid, usually from escrow. If you cannot travel, you can sign through a power of attorney you grant to someone you trust.',
        ],
      },
      {
        h: '7. Register the property',
        body: [
          'The notary pays the 1.5% transfer tax and files the deed at the Instituto de la Propiedad. You become the registered owner once registration is complete; ask your attorney for a copy of the registered deed and keep it safe.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'How long does it take to buy property in Roatán?', a: 'A simple cash purchase usually closes in one to three months after the offer, depending on due diligence and registration. Homes themselves take a long time to sell: about ten months on average, according to Buying Roatan.' },
      { q: 'Can I get a mortgage to buy in Roatán?', a: 'Mortgages for foreign buyers are rare on Roatán. Most buyers pay cash, use funds from selling a home at home, or negotiate seller financing.' },
      { q: 'Do I need a lawyer to buy property in Honduras?', a: 'Yes. Deeds must be signed before a Honduran notary, and you should hire your own attorney (not the seller’s) to check the title and handle registration.' },
      { q: 'Can I buy property in Roatán remotely?', a: 'Yes. Many buyers sign through a power of attorney granted to their attorney or a trusted person, after viewing the property themselves or by video.' },
    ],
    sources: [SOURCES.buyingRoatan, SOURCES.latMarket, SOURCES.latTaxes, SOURCES.latRisks],
    related: ['can-foreigners-buy-property-in-roatan', 'roatan-closing-costs', 'how-to-check-land-title-in-roatan'],
  },
  {
    slug: 'roatan-closing-costs',
    title: 'Roatán closing costs and property taxes in 2026',
    short: 'Closing costs and taxes',
    description: 'What it really costs to buy property on Roatán: 1.5% transfer tax, legal and notary fees, registration, annual property tax and capital gains tax, with a worked example.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'Buyers on Roatán should budget about 3–7% of the purchase price for closing costs, with most straightforward deals landing at 4–5.5%. The main items are the 1.5% transfer tax and 1–3% in legal and notary fees. Annual property tax is low, about 0.25% of the cadastral value, and the seller usually pays the agent’s commission.',
    keyFacts: [
      'Transfer tax: 1.5% of the price, paid by the buyer.',
      'Attorney and notary fees: about 1–3% of the price.',
      'Annual property tax: about 0.25% of the cadastral (official) value.',
      'Capital gains tax when you sell: 10% of the profit.',
      'Agent commission (≈ 10% on Roatán) is normally paid by the seller.',
    ],
    sections: [
      {
        h: 'Buyer closing costs',
        body: [
          { table: { head: ['Item', 'Typical cost', 'Paid by'], rows: [
            ['Transfer tax', '1.5% of the price', 'Buyer'],
            ['Attorney and notary fees', '1–3% of the price', 'Buyer'],
            ['Registration and stamps', 'small fixed and percentage fees', 'Buyer'],
            ['Surveys, title search, escrow', 'varies by deal', 'Buyer'],
            ['Agent commission', '≈ 10% of the price', 'Seller'],
          ] } },
          'Sources differ on legal fees: [The LatInvestor](https://thelatinvestor.com/blogs/news/roatan-island-property-taxes-fees) puts them at 1–3%, while [Global Property Guide](https://www.globalpropertyguide.com/Latin-America/Honduras/Buying-Guide) quotes 3–5% notary fees nationally. Ask for a written quote before you sign anything.',
        ],
      },
      {
        h: 'Worked example: a $300,000 home',
        body: [
          { table: { head: ['Item', 'Estimate'], rows: [
            ['Transfer tax (1.5%)', '$4,500'],
            ['Legal and notary (1–3%)', '$3,000 – $9,000'],
            ['Registration, survey, escrow', '$1,000 – $3,000'],
            ['Total', '≈ $8,500 – $16,500 (about 3–5.5%)'],
          ] } },
          'Buying through a Honduran company, or a complex deal with several parcels, can push total costs to 7% or more.',
        ],
      },
      {
        h: 'Costs of owning',
        body: [
          { list: [
            '**Property tax**: about 0.25% a year of the cadastral value, which is often below the market price. A home with a $100,000 cadastral value pays roughly $250 a year.',
            '**HOA fees** for condos and gated communities, which can cover security, insurance, pools and grounds.',
            '**Insurance**, including windstorm cover. Roatán sits in the Caribbean hurricane belt.',
            '**Property management** if you rent the home out while abroad.',
          ] },
        ],
      },
      {
        h: 'When you sell',
        body: [
          'Capital gains tax is 10% of the profit. The seller also normally pays the agent’s commission, which on Roatán is commonly about 10% ([Tomas Figueroa](https://www.tomasfigueroa.com/roatan-market)). Keep your deed, receipts and records of improvements to document your cost basis.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'What are closing costs in Roatán?', a: 'Buyers usually pay about 3–7% of the purchase price, most often 4–5.5%. That covers the 1.5% transfer tax, 1–3% attorney and notary fees, registration and small extras such as surveys and escrow.' },
      { q: 'How much is property tax in Roatán?', a: 'About 0.25% a year of the cadastral value set by the municipality, which is often lower than the market price. A property with a $100,000 cadastral value pays roughly $250 a year.' },
      { q: 'Who pays the real-estate agent in Roatán?', a: 'The seller normally pays the agent’s commission, commonly around 10% of the price on Roatán.' },
      { q: 'Is there capital gains tax in Honduras?', a: 'Yes. When you sell property in Honduras, capital gains tax is 10% of the profit.' },
    ],
    sources: [SOURCES.latTaxes, SOURCES.gpg, SOURCES.figueroa],
    related: ['how-to-buy-property-in-roatan', 'roatan-rental-income', 'can-foreigners-buy-property-in-roatan'],
  },
  {
    slug: 'how-to-check-land-title-in-roatan',
    title: 'How to check a land title on Roatán before you buy',
    short: 'How to check a land title',
    description: 'Title fraud is the biggest risk when buying on Roatán. A practical checklist: registry search, lien certificate, cadastral survey, seller identity, power of attorney, taxes and permits.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'To check a title on Roatán, have your own attorney pull the registered title and a lien certificate from the Instituto de la Propiedad, match the cadastral survey to the actual lot, confirm the seller’s identity or verify any power of attorney independently, and check that municipal taxes are paid. Never pay a deposit before these checks are done.',
    keyFacts: [
      'Common scams on Roatán include forged powers of attorney, fake sellers and land with competing claims.',
      'Titles are registered at the Instituto de la Propiedad (IP), the national property institute.',
      '“Possession rights” (derechos posesorios) are not the same as registered title.',
      'Resoha’s land passport shows which checks have been confirmed for each lot, and when.',
    ],
    sections: [
      {
        h: 'Why title checks matter so much here',
        body: [
          'Analysts at [The LatInvestor](https://thelatinvestor.com/blogs/news/roatan-island-risks-pitfalls) list forged powers of attorney (poder), fake sellers and parcels with competing claims among the most common problems on Roatán. With no MLS and no licensing for agents, the buyer has to verify the basics.',
        ],
      },
      {
        h: 'The checklist',
        body: [
          { list: [
            '**Registered title.** Ask your attorney for the registry entry at the Instituto de la Propiedad and confirm the seller is the registered owner.',
            '**Lien certificate.** A certificate showing there are no mortgages, liens or claims against the property (certificado de libertad de gravamen).',
            '**Title history.** Review previous transfers for gaps or unusual jumps in ownership.',
            '**Cadastral survey.** Match the registered survey and boundaries to the lot you walked. Ask for a fresh survey if markers are missing.',
            '**Seller identity.** Meet the owner or verify their ID through your attorney. If someone sells on the owner’s behalf, verify the power of attorney directly with the notary who issued it.',
            '**Municipal taxes.** Get proof that property taxes are paid up (solvencia municipal).',
            '**Access and utilities.** For land, confirm legal road access, electricity (RECO) and water.',
            '**Zoning and permits.** Check the zone and whether ZOLITUR building permits apply or have been granted.',
          ], ordered: true },
        ],
      },
      {
        h: 'Registered title vs. possession rights',
        body: [
          'Some land, especially on the less developed parts of the island, is offered with possession rights only (derechos posesorios), not a registered title. Turning possession into registered title can take time and is not guaranteed. Treat such land as higher risk and price it accordingly.',
        ],
      },
      {
        h: 'How Resoha helps',
        body: [
          'Every land listing on Resoha carries a [land passport](/land-passport): title status, road access, electricity, water, survey, ZOLITUR permit, zone and slope, each marked as confirmed or not, with the date of the check. You can download it as a PDF and send it to your attorney.',
          { note: 'The land passport records what has been confirmed and by whom. It does not replace a title search by your own attorney.' },
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'How do I verify a property title in Honduras?', a: 'Hire your own attorney to pull the registry entry and a lien certificate from the Instituto de la Propiedad, compare the cadastral survey with the lot, and confirm the seller’s identity before you pay any deposit.' },
      { q: 'What is a poder and why is it risky?', a: 'A poder is a power of attorney that lets someone sell on the owner’s behalf. Forged powers are a known scam on Roatán, so verify any poder directly with the notary who issued it.' },
      { q: 'Is title insurance available on Roatán?', a: 'Title insurance is uncommon in Honduras. Buyers rely mainly on their own attorney’s title search, so that search needs to be thorough.' },
    ],
    sources: [SOURCES.latRisks, SOURCES.gpg],
    related: ['can-foreigners-buy-property-in-roatan', 'how-to-buy-property-in-roatan', 'roatan-closing-costs'],
  },
  {
    slug: 'roatan-rental-income',
    title: 'Roatán rental income: Airbnb occupancy and realistic yields in 2026',
    short: 'Rental income and yields',
    description: 'Honest numbers for Roatán holiday rentals: 1,002 active listings, 43% occupancy, $209 average nightly rate and 5–8% net yields quoted by local agents, with a worked example.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'Roatán holiday rentals average about 43% occupancy at roughly $209 a night, according to AirDNA, which means around $32,800 a year in gross revenue for a typical listing. Local agents quote net yields of about 5–8% a year after costs. The supply of rentals fell by about half over the past year, which has pushed occupancy up.',
    keyFacts: [
      '1,002 active short-term rentals on Roatán, down 48.7% year on year (AirDNA).',
      'Average occupancy 43% and average nightly rate about $209 (AirDNA).',
      'Net yields of about 5–8% a year, as quoted by local agents.',
      '1.7 million cruise passengers visited in 2024, and direct flights connect Roatán to 8 North American cities.',
    ],
    sections: [
      {
        h: 'The market in numbers',
        body: [
          { table: { head: ['Metric', 'Value', 'Source'], rows: [
            ['Active short-term rentals', '1,002', 'AirDNA'],
            ['Change in listings, year on year', '−48.7%', 'AirDNA'],
            ['Average occupancy', '43%', 'AirDNA'],
            ['Average nightly rate', '≈ $209', 'AirDNA'],
            ['Cruise passengers (2024)', '1.7 million', 'Revista E&N'],
          ] } },
        ],
      },
      {
        h: 'Worked example',
        body: [
          'A listing at the island average earns about $209 × 365 nights × 43% ≈ **$32,800 a year in gross revenue**. From that come platform fees, cleaning, a property manager (often 20–30% of revenue), utilities, HOA, insurance, maintenance and property tax.',
          'On a $400,000 condo, a 5–8% net yield means about $20,000–$32,000 a year. Treat the top of that range as a well-run, well-located unit, not the norm.',
        ],
      },
      {
        h: 'What drives returns on Roatán',
        body: [
          { list: [
            '**Location.** West Bay and West End command the highest rates; the east of the island rents less often.',
            '**Season.** High season runs roughly December to April, when North Americans travel south.',
            '**Management.** Most owners live abroad, so a good local manager matters more than any single feature.',
            '**Access.** Direct flights from Miami, Houston, Atlanta, Dallas, Denver, Minneapolis, Toronto and Montreal bring guests straight to the island.',
          ] },
        ],
      },
      {
        h: 'Before you buy for rental',
        body: [
          'Ask the seller or agent for real booking history, not projections. Check whether the building or community allows short-term rentals, and what share of revenue its rental programme takes. Remember that you will pay the island’s [closing costs](/guides/roatan-closing-costs) and a 10% capital gains tax when you sell.',
          'Browse listings tagged [Rental income](/listings?deal=sale&tags=Rental%20income) on Resoha.',
        ],
      },
      { h: 'Important', body: [{ note: 'Figures are third-party estimates for the whole island and change month to month. They are not a forecast for any particular property.' }] },
    ],
    faq: [
      { q: 'Is Airbnb profitable in Roatán?', a: 'It can be. AirDNA reports 43% average occupancy at about $209 a night, roughly $32,800 a year in gross revenue for a typical listing. Local agents quote net yields of about 5–8% after costs.' },
      { q: 'What is the best area in Roatán for vacation rentals?', a: 'West Bay and West End have the strongest tourist demand and the highest nightly rates on the island.' },
      { q: 'When is high season in Roatán?', a: 'Roughly December to April, when North American visitors escape winter.' },
    ],
    sources: [SOURCES.airdna, SOURCES.cruise, SOURCES.flights, SOURCES.latMarket],
    related: ['roatan-closing-costs', 'best-areas-to-live-in-roatan', 'how-to-buy-property-in-roatan'],
  },
  {
    slug: 'best-areas-to-live-in-roatan',
    title: 'Best areas to live in Roatán: neighbourhoods and prices compared',
    short: 'Best areas to live',
    description: 'West Bay, West End, Sandy Bay, Coxen Hole, French Harbour, Oak Ridge and the East End compared: who each area suits and what property costs there in 2026.',
    published: '2026-10-03',
    updated: '2026-10-03',
    answer: 'The best area to live on Roatán depends on what you want: West Bay for beachfront luxury ($700K–$2.5M), West End for a walkable dive village ($300K–$700K), Sandy Bay for quiet family life ($250K–$900K), French Harbour for value and services ($150K–$500K), Coxen Hole for the lowest prices ($100K–$300K), and Oak Ridge or the East End for quiet waterfront living and land.',
    keyFacts: [
      'Prices fall from west to east across the island.',
      'West Bay and West End have the most tourism and the strongest rental demand.',
      'French Harbour and Coxen Hole have the most year-round services.',
      'The East End has the most land and the largest lots.',
    ],
    sections: [
      {
        h: 'Areas at a glance',
        body: [
          { table: { head: ['Area', 'Typical prices', 'Best for'], rows: [
            ['[West Bay](/areas/west-bay)', '$700K – $2.5M', 'Luxury, beachfront, holiday rentals'],
            ['[West End](/areas/west-end)', '$300K – $700K', 'Expats, divers, walkable village life'],
            ['[Sandy Bay](/areas/sandy-bay)', '$250K – $900K', 'Families, retirees'],
            ['[French Harbour](/areas/french-harbour)', '$150K – $500K', 'Value, marinas, year-round living'],
            ['[Coxen Hole](/areas/coxen-hole)', '$100K – $300K', 'Budget buyers, local services'],
            ['[Oak Ridge](/areas/oak-ridge)', 'below the west', 'Quiet waterfront, boat access'],
            ['[East End](/areas/east-end)', 'below the west', 'Land, privacy, building your own'],
          ] } },
          'Price ranges for the first five areas are from [The LatInvestor](https://thelatinvestor.com/blogs/news/roatan-island-real-estate-market). Oak Ridge and the East End have too few sales for a reliable range.',
        ],
      },
      {
        h: 'If you want the beach',
        body: [
          'Choose **West Bay**, the island’s famous beach with reef snorkelling from shore, or **West End** if you prefer a village with restaurants and dive shops over resorts. Both have the strongest holiday-rental demand.',
        ],
      },
      {
        h: 'If you will live here year-round',
        body: [
          '**Sandy Bay** offers quiet residential streets close to everything. **French Harbour** and the gated communities around it (Parrot Tree, Palmetto Bay, Pristine Bay) give you supermarkets, marinas and services. **Coxen Hole** is the island’s working capital, next to the airport, with the lowest prices.',
        ],
      },
      {
        h: 'If you want land or quiet',
        body: [
          '**Oak Ridge** is a traditional fishing town on the water. The **East End**, from Punta Gorda to Camp Bay, has the most undeveloped land. Check road, power, water and title lot by lot using the [land passport](/land-passport).',
        ],
      },
    ],
    faq: [
      { q: 'What is the best area to live in Roatán?', a: 'It depends on your priorities. West End suits people who want a walkable village and diving, Sandy Bay suits families and retirees, French Harbour suits year-round residents who want services, and West Bay suits beachfront luxury buyers.' },
      { q: 'Where do most expats live on Roatán?', a: 'Most expats live on the west side of the island, in and around West End, West Bay and Sandy Bay, with a growing number in French Harbour’s gated communities.' },
      { q: 'What is the cheapest area of Roatán?', a: 'Coxen Hole and the south shore have the lowest prices, typically about $100,000 to $300,000 according to The LatInvestor. The East End has the cheapest land.' },
    ],
    sources: [SOURCES.latMarket, SOURCES.buyingRoatan],
    related: ['how-to-buy-property-in-roatan', 'roatan-rental-income', 'can-foreigners-buy-property-in-roatan'],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
