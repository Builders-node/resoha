import { SOURCES, type Source } from './sources';

/**
 * Гайди для покупців. Кожен відкривається прямою відповіддю на питання із заголовка:
 * саме цей абзац підхоплюють і сніпети Google, і відповіді ChatGPT/Perplexity.
 * Текст підтримує `[посилання](/шлях)` і `**жирний**` (components/Rich).
 */
/** Фото в тексті: лише справжні знімки з видимим автором і ліцензією в підписі (caption). */
export type Figure = {
  /** шлях у public/, напр. /photos/guides/…webp */
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
};

export type Block =
  | string
  | { list: string[]; ordered?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string }
  | { image: Figure };

/** Автор-людина. Без нього гайд підписано командою сайту. Фото й сторінку автора не вигадуємо. */
export type Author = { name: string; role: string; bio: string };

export type Guide = {
  slug: string;
  title: string;
  /** коротший <title> для видачі, коли title (він же H1) довший за 65 знаків */
  seoTitle?: string;
  /** коротка назва для карток і хлібних крихт */
  short: string;
  description: string;
  published: string;
  updated: string;
  /** пряма відповідь, 2–3 речення */
  answer: string;
  keyFacts?: string[];
  /** головне фото під підписом автора; вантажиться одразу, решта фото — ліниво */
  hero?: Figure;
  author?: Author;
  /** коли востаннє перевіряли джерела, якщо це вказано в тексті */
  checked?: string;
  sections: { h: string; body: Block[] }[];
  /** заголовок розділу питань, якщо не стандартний */
  faqTitle?: string;
  faq: { q: string; a: string }[];
  /** false — без розмітки FAQPage: коли текст не має обіцяти FAQ-сніпети у видачі */
  faqSchema?: false;
  sources: Source[];
  related: string[];
};

const DISCLAIMER = 'This guide is general information, not legal or tax advice. Rules and fees change; confirm every step with a Honduran attorney (abogado y notario) before you pay a deposit.';

export const GUIDES: Guide[] = [
  {
    slug: 'can-foreigners-buy-property-in-roatan',
    title: 'Can foreigners buy property in Roatán? The 3,000 m² rule explained',
    seoTitle: 'Can foreigners buy property in Roatán? The 3,000 m² rule',
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
          'On Hogarli, land listings carry a [land passport](/land-passport) that shows which of these facts have been confirmed and when.',
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
          'Because there is no MLS, the same property can appear at different prices on different sites, and sold homes often stay online. On [Hogarli](/listings?deal=sale), every listing links back to the island agency that holds it, so you can see where the details came from.',
          'Ask any agent how long they have worked on the island, which agency they belong to and for references from past buyers. Read reviews on their [Hogarli profile](/agents).',
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
      'Hogarli’s land passport shows which checks have been confirmed for each lot, and when.',
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
        h: 'How Hogarli helps',
        body: [
          'Every land listing on Hogarli carries a [land passport](/land-passport): title status, road access, electricity, water, survey, ZOLITUR permit, zone and slope, each marked as confirmed or not, with the date of the check. You can download it as a PDF and send it to your attorney.',
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
    seoTitle: 'Roatán rental income: Airbnb occupancy and yields in 2026',
    short: 'Rental income and yields',
    description: 'Honest numbers for Roatán holiday rentals: 1,002 active listings, 43% occupancy, $209 average nightly rate and 5–8% net yields quoted by local agents, with a worked example.',
    published: '2026-10-03',
    updated: '2026-10-17',
    answer: 'Roatán holiday rentals average about 43% occupancy at roughly $209 a night, according to AirDNA, and a typical listing earns about $15,500 a year in gross revenue. Local agents quote net yields of about 5–8% a year after costs, which only well-run units in the best locations reach. The supply of rentals fell by about half over the past year, which has pushed occupancy up.',
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
            ['Average yearly revenue per listing', '≈ $15,500', 'AirDNA'],
            ['Cruise passengers (2024)', '1.7 million', 'Revista E&N'],
          ] } },
        ],
      },
      {
        h: 'Worked example',
        body: [
          'AirDNA puts the average Roatán listing at about **$15,500 a year in gross revenue**. That is less than $209 × 365 nights × 43% (about $32,800), because most listings are not open for bookings all year. From the revenue come platform fees, cleaning, a property manager (often 20–30% of revenue), utilities, HOA, insurance, maintenance and property tax.',
          'On a $400,000 condo, a 5–8% net yield would mean $20,000–$32,000 a year, more than the island’s average gross revenue. Returns like that need a well-run unit in West Bay or West End that is booked most of the year; for an average listing, plan on far less.',
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
          'Run your own numbers in the [rental yield calculator](/rental-yield-calculator); every condo and house for sale on Hogarli has one with its price and HOA filled in. Browse listings tagged [Rental income](/listings?deal=sale&tags=Rental%20income).',
        ],
      },
      { h: 'Important', body: [{ note: 'Figures are third-party estimates for the whole island and change month to month. They are not a forecast for any particular property.' }] },
    ],
    faq: [
      { q: 'Is Airbnb profitable in Roatán?', a: 'It can be. AirDNA reports 43% average occupancy at about $209 a night and about $15,500 a year in gross revenue for a typical listing. Local agents quote net yields of about 5–8% after costs, but only the best-run units reach that.' },
      { q: 'What is the best area in Roatán for vacation rentals?', a: 'West Bay and West End have the strongest tourist demand and the highest nightly rates on the island.' },
      { q: 'When is high season in Roatán?', a: 'Roughly December to April, when North American visitors escape winter.' },
    ],
    sources: [SOURCES.airdna, SOURCES.cruise, SOURCES.flights, SOURCES.latMarket],
    related: ['roatan-closing-costs', 'best-areas-to-live-in-roatan', 'how-to-buy-property-in-roatan', 'is-roatan-safe'],
  },
  {
    slug: 'best-areas-to-live-in-roatan',
    title: 'Best areas to live in Roatán: neighbourhoods and prices compared',
    seoTitle: 'Best areas to live in Roatán: neighbourhoods compared',
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
    related: ['west-end-vs-west-bay', 'is-roatan-safe', 'cost-of-living-in-roatan', 'how-to-buy-property-in-roatan', 'roatan-rental-income', 'can-foreigners-buy-property-in-roatan'],
  },
  {
    slug: 'is-roatan-safe',
    title: "Is Roatán Safe? A Guide for Buyers and Expats",
    seoTitle: "Is Roatán Safe? A Guide for Buyers & Expats",
    short: "Is Roatán safe?",
    description: "Is Roatán safe? Official advice on crime, walking at night, hospitals and hurricane preparation, plus practical property checks for buyers.",
    published: '2026-11-03',
    updated: '2026-11-03',
    checked: '2026-11-02',
    author: {
      name: "Taras Chaus",
      role: "CBDO at Hogarli",
      bio: "**About the author:** Taras Chaus is CBDO at Hogarli and has lived on Roatán for four months as of November 2026.",
    },
    hero: {
      src: "/photos/guides/west-bay-looking-north-pi3-124-2016.webp",
      alt: "West Bay beach and coastline, looking north in 2016",
      width: 1920,
      height: 1080,
      caption: "West Bay, 2016. Resized and converted to WebP. Photo: [Pi3.124 / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Roatan_West_Bay_looking_north.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).",
    },
    answer: "Canada’s travel advice describes the Bay Islands as generally safe, while warning about petty crime, beach assaults and burglaries at rentals. For buyers and future residents, the practical priorities are secure housing, transport after dark, medical care and property checks.",
    sections: [
      {
        h: "Roatán safety: three practical precautions",
        body: [
          "Canada’s government advises a high degree of caution in Honduras. Its [country advisory](https://travel.gc.ca/destinations/honduras) includes specific guidance for the Bay Islands.",
          "The Canadian advisory supports three practical steps:",
          { list: [
              "Avoid isolated beaches and poorly lit areas after dark. It specifically names Coxen Hole, Los Fuertes and Suampo as places to avoid after dark.",
              "Choose secure accommodation and lock doors and windows at night and when away.",
              "Arrange insurance that covers hospital stays and medical evacuation.",
            ] },
          "Read the full advisory before travel for the latest guidance.",
        ],
      },
      {
        h: "Crime on Roatán: plan around the reported risks",
        body: [
          "Canada’s advisory describes petty crime, assaults on beaches mainly at night, and burglaries at vacation rentals. Use those risks to plan how you carry valuables, secure your accommodation and get home after an evening out.",
          "Keep bags attended on the beach and valuables out of sight. At a viewing, test locks rather than assuming they work. Ask the host or property manager who responds if you lose a key or need help outside normal hours. If you will leave the home empty, agree who inspects it and how problems are reported.",
        ],
      },
      {
        h: "Where to stay in Roatán: check the home and the route",
        body: [
          "Treat security as a viewing checklist rather than a marketing label. Ask who controls access, how visitors enter, who handles maintenance and what happens when the property is empty. Check the route to shops and medical care, not just the view from the balcony.",
          "Visit at different times if possible. A listing can show a building, but it cannot tell you whether its surroundings and transport arrangements suit your routine. Our [area comparison](/guides/best-areas-to-live-in-roatan) can help you choose which neighborhoods to visit.",
          {
            image: {
              src: "/photos/guides/beta-district-entrance-taras-chaus.webp",
              alt: "Daytime view of the Beta District entrance, with a vehicle barrier, gatehouse and tropical vegetation",
              width: 1350,
              height: 1800,
              caption: "Beta District entrance. Photo: Taras Chaus.",
            },
          },
          "Compare the actual home rather than choosing an area only because an advert calls it safe. Useful questions include:",
          {
            table: {
              head: ["Check", "Ask at the viewing"],
              rows: [
                ["**Access**", "Who can enter, and how are visitors handled?"],
                ["**Building**", "Do exterior lights, locks and windows work? Who repairs them?"],
                ["**Evenings**", "Where can a taxi drop you? What is the route to the door?"],
                ["**Management**", "Who responds when you are away?"],
              ],
            },
          },
          "Explore [West Bay](/areas/west-bay), [West End](/areas/west-end) and [Sandy Bay](/areas/sandy-bay) as part of your shortlist, then assess each property and its surroundings in person.",
        ],
      },
      {
        h: "Is it safe to walk in Roatán at night?",
        body: [
          "Canada advises avoiding Coxen Hole, Los Fuertes and Suampo after dark, as well as isolated beaches and poorly lit places. Favor populated, well-lit routes and arrange transport when the alternative is an isolated walk.",
          "Its transport guidance for Honduras recommends reliable taxis recommended by a hotel and prearranged airport pickups. Ask your accommodation provider how to arrange transport, and plan the journey home before you leave. Do not rely on an unfamiliar beach route as a shortcut after dark.",
        ],
      },
      {
        h: "Hospitals in Roatán and emergency contacts",
        body: [
          "Canada warns that emergency medical facilities in the Bay Islands are limited and major treatment may require evacuation.",
          "Two private providers publish the following details:",
          {
            table: {
              head: ["Provider", "Location", "Contact advertised by provider"],
              rows: [
                [
                  "[CEMESA Roatán](https://cemesaroatan.com/)",
                  "Brick Bay",
                  "24/7 emergency service: **+504 9446-0097**; PBX **+504 2454-7014**",
                ],
                [
                  "[Hospital Wood Medical Center](https://www.hospitalwoodmedicalcenter.com/)",
                  "Coxen Hole",
                  "Emergency contact: **+504 9828-8166**",
                ],
              ],
            },
          },
          "Confirm services, payment arrangements and insurance coverage with the provider. **For an emergency, call 911.**",
        ],
      },
      {
        h: "Is buying property in Roatán safe?",
        body: [
          "A reassuring neighborhood does not establish clear ownership. Before committing funds, use an independent Honduran lawyer to assess the documents and proposed transaction. Ask questions about ownership, boundaries, access and any restrictions that matter to your plans.",
          "Start with our [land-title guide](/guides/how-to-check-land-title-in-roatan) and [property-scam guide](/blog/how-to-spot-property-scams-in-honduras). Both explain questions to raise with your lawyer.",
        ],
      },
      {
        h: "Hurricane season and water safety",
        body: [
          "The [National Hurricane Center](https://www.nhc.noaa.gov/climo/) dates the Atlantic hurricane season, including the Caribbean basin, from **June 1 to November 30**. At a property viewing, ask about drainage, storm preparation, shutters and the building’s emergency plan. Check the actual insurance wording for the home.",
          "Canada’s travel advice warns about currents and inconsistent lifeguard coverage. Choose established water-activity operators, follow local instructions and avoid swimming alone or outside designated areas.",
        ],
      },
      {
        h: "Living in Roatán: your first-month checklist",
        body: [
          { list: [
              "Save **911**, hospital contacts and your accommodation manager’s number.",
              "Arrange arrival and evening transport.",
              "Test locks and agree who handles maintenance or security problems.",
              "Confirm medical and evacuation coverage.",
              "Learn the building’s storm procedures and the route to medical care.",
              "Compare areas in person before making a long-term property commitment.",
            ] },
          "Compare [properties for sale](/listings?deal=sale) or [rentals](/listings?deal=rent) while deciding which area suits you.",
        ],
      },
    ],
    faqTitle: "Questions buyers ask",
    faq: [
      { q: "What is the safest area to live in Roatán?", a: "The sources used here do not establish a neighborhood safety ranking. Compare access, lighting, management and the routes you will use, rather than relying on a label in a listing." },
      { q: "Is Roatán safer than mainland Honduras?", a: "Canada describes the Bay Islands as generally safe and distinguishes them from higher-risk parts of Honduras. Follow its specific precautions rather than treating every mainland location or every island neighborhood as the same." },
      { q: "What should I ask about a guarded entrance?", a: "Find out who controls visitor access, when staff are present and how residents report incidents." },
      { q: "Should I know my nearest hospital before moving?", a: "Yes. Save its contact details, confirm its services and check your insurance arrangements." },
    ],
    // FAQ на сторінці лишається, але без FAQPage: текст не обіцяє FAQ-сніпетів у видачі
    faqSchema: false,
    sources: [SOURCES.canadaHonduras, SOURCES.nhcSeason, SOURCES.cemesa, SOURCES.woodMedical],
    related: ['best-areas-to-live-in-roatan', 'cost-of-living-in-roatan', 'how-to-check-land-title-in-roatan', 'how-to-buy-property-in-roatan'],
  },
  {
    slug: 'cost-of-living-in-roatan',
    title: "Cost of Living in Roatán: Build a Budget Around Your Home",
    seoTitle: "Cost of Living in Roatán: Budget Guide",
    short: "Cost of living in Roatán",
    description: "Plan the cost of living in Roatán with dated rental examples, a monthly budget checklist and questions about utilities, groceries and transport.",
    published: '2026-11-09',
    updated: '2026-11-09',
    // у тексті: «Rental examples checked November 5, 2026»
    checked: '2026-11-05',
    author: {
      name: "Taras Chaus",
      role: "CBDO at Hogarli",
      bio: "**About the author:** Taras Chaus is CBDO at Hogarli.",
    },
    hero: {
      src: "/photos/guides/west-end-coastal-buildings-2016-10-26.webp",
      alt: "Coastal buildings and shoreline in West End, Roatán",
      width: 1600,
      height: 996,
      // дужки в адресі Commons закодовано: Rich обриває посилання на першій «)»
      caption: "West End shoreline, October 26, 2016. Historical area photograph, not one of the advertised rentals. [West End Isla Roatan](https://commons.wikimedia.org/wiki/File:West_End_Isla_Roatan_%2832004256653%29.jpg) · Prayitno / Thank you for (12 millions +) view · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Resized and converted to WebP.",
    },
    answer: "The **cost of living in Roatán** starts with your home, but the advertised rent is only one part of the budget. Before choosing a place, put rent, electricity, water, internet, groceries and transport on the same monthly worksheet. Then separate recurring bills from the cash you need to move in.",
    sections: [
      {
        h: "What does rent cost in Roatán?",
        body: [
          "Below are three named rental examples advertised on Hogarli, followed by the questions that turn a listing price into a household budget. They are examples to investigate, not an average cost for the island.",
          "Hogarli's area pages displayed these long-term rental asking prices on November 5, 2026:",
          {
            table: {
              // «**Area**», а не «Area»: голе слово вже перекладено в каталозі як площа («Área»)
              head: ["Advertised home", "**Area**", "Monthly asking rent"],
              rows: [
                ["One-bedroom loft 6 at Alba Plaza", "Gibson Bight, shown on the West End area page", "US$550"],
                ["Studio at Mar Vista", "Above West Bay", "US$700"],
                ["Two-bedroom upper unit at Tortuga Bahia", "West Bay", "US$900"],
              ],
            },
          },
          "Sources: [West End area page](/areas/west-end) and [West Bay area page](/areas/west-bay). This is a selection of three advertised homes, not a representative survey. Confirm availability, lease length, deposit and included services with the listing agent.",
          "Compare like with like. A studio and a two-bedroom home answer different needs. Before comparing the amounts, check whether each offer includes furniture, water, internet, parking or any community charges. Record anything paid separately rather than assuming the rent covers it.",
          "Use the [rental listings](/listings?deal=rent) to build your shortlist, checking the location of each home. The listing search also includes other parts of Honduras.",
        ],
      },
      {
        h: "A monthly budget for living in Roatán",
        body: [
          "Use one currency throughout your worksheet. Where a bill is in lempiras and your rent is quoted in US dollars, record the conversion rate and any payment charge actually available to you.",
          {
            table: {
              head: ["Budget line", "Evidence to collect"],
              rows: [
                ["**Rent**", "Written amount, currency, term and included services"],
                ["**Electricity**", "Recent bills for the actual home and its occupancy"],
                ["**Water**", "Who supplies it, what is included, and any separate delivery charge"],
                ["**Internet and mobile**", "Address-specific quote, taxes, equipment and installation"],
                ["**Groceries and household supplies**", "A basket you would buy regularly, with sizes and prices"],
                ["**Transport**", "Quotes for your real routes, or actual vehicle running costs"],
                ["**Health cover and care**", "Quotes suited to your household and coverage needs"],
                ["**Other recurring costs**", "Cleaning, laundry, subscriptions and agreed community fees"],
              ],
            },
          },
          "**Monthly total = rent + separately paid services + everyday spending.** Do not count a service twice if it is already included in rent.",
          "Keep a separate line for a contingency amount you choose. It should be an explicit part of your plan, not money left over by accident.",
        ],
      },
      {
        h: "Electricity: ask for the home's bills",
        body: [
          "A budget based on another household's bill can be misleading. Ask for several recent electricity bills and the dates they cover. Find out how many people were living there, whether the home was occupied throughout the period and how air conditioning was used.",
          "At the viewing, ask:",
          { list: [
              "Is the home individually metered?",
              "Who issues the bill, and how is a shared bill divided?",
              "Are there outstanding charges or a separate service deposit?",
              "Which appliances and cooling equipment will you actually use?",
            ] },
          "Use the applicable supplier's current billing terms rather than importing a mainland tariff or treating an old quoted price per kilowatt-hour as current.",
          "For September–November 2026, Honduras's electricity regulator, [CREE, publishes these RECO residential tariff components](https://www.cree.gob.hn/tarifas-vigentes-roatan/):",
          {
            table: {
              head: ["Monthly consumption category", "Fixed charge", "Energy charge"],
              rows: [
                ["Up to 150 kWh", "HNL26.9294", "HNL6.1103/kWh"],
                ["More than 150 kWh", "HNL39.4514", "HNL8.9515/kWh"],
              ],
            },
          },
          "These are tariff components, not complete household bills. Confirm the applicable category calculation, taxes and other charges with the supplier. Do not read the two categories as an instruction to split a bill into blocks. The regulator also publishes a [quarterly RECO tariff summary](https://www.cree.gob.hn/resumen-informe-trimestral-de-tarifas-reco/).",
        ],
      },
      {
        h: "Internet and water: confirm the exact address",
        body: [
          "Local provider [MAXCOM](https://www.maxcom.hn/) advertises a 350 Mbps residential plan at **HNL1,250 per month**, checked November 5. Its price display includes the wording “IVA / por mes”; confirm whether tax is included and obtain the full installation and equipment quote before budgeting.",
          "For internet, request a quote for the home itself, not just a plan advertised for a wider area. Ask about installation, equipment, taxes, commitment period and what happens when you move out. If you work remotely, test the connection where you will work and ask how any backup option is paid for.",
          "For water, ask who provides it and whether rent includes the full charge. If the property uses tanks, pumps or delivered water, establish who pays for delivery, electricity and maintenance. Put only the charges you actually expect to pay into your worksheet.",
        ],
      },
      {
        h: "Groceries and transport: price your own routine",
        body: [
          "Build a small shopping basket around what your household normally uses: food, drinking water, cleaning products and toiletries. Compare equivalent pack sizes and keep the date and currency. A restaurant menu or holiday shopping bill is not a substitute for your normal household basket.",
          "For transport, list the journeys you will repeat: groceries, work, school, appointments and evening trips. Get quotes for those routes and times. If you plan to drive, include fuel, insurance, servicing and any parking charges, rather than treating the purchase of a vehicle as the whole cost.",
          "This is where area choice becomes a practical budget decision. Compare [West End](/areas/west-end), [West Bay](/areas/west-bay) and [Sandy Bay](/areas/sandy-bay) against the places you will visit regularly, not just the view from the home.",
        ],
      },
      {
        h: "Moving-in costs are separate from monthly living costs",
        body: [
          "Before paying, ask for a written list of the first payment, deposit, utility setup, internet installation and any agreed furniture or household purchases. Show the deposit as cash needed to move in, separately from recurring spending; its return depends on the agreed terms and the condition of the home.",
          "Our [rent-before-buying guide](/blog/renting-in-honduras-before-you-buy) covers lease and viewing questions. If you plan to buy, keep purchase costs in a separate calculation using the [closing-cost guide](/guides/roatan-closing-costs). Do not mix a purchase deposit with a monthly household budget.",
        ],
      },
      {
        h: "Retiring in Roatán or working remotely",
        body: [
          "Build the budget around the people who will live in the home. A retiree should check the cost and scope of suitable health coverage and access to care. A remote worker should verify connectivity and any backup arrangements. Families should obtain actual school and transport quotes if those apply.",
          "For emergency-care planning and published provider contacts, see the [Roatán safety guide](/guides/is-roatan-safe). Those contacts do not replace an individual insurance quote.",
        ],
      },
      {
        h: "Before you commit to a home",
        body: [
          { list: [
              "Confirm the rent, currency and term in writing.",
              "Get a list of included and separately charged services.",
              "Review bills for the actual property.",
              "Price your regular shopping and journeys.",
              "Separate move-in cash from recurring monthly spending.",
              "Compare the completed budget with another shortlisted home.",
            ] },
          "The useful question is not simply “Is Roatán cheap?” It is whether a particular home and routine fit the budget you can sustain. Start with real offers, replace assumptions with quotes, and keep the calculation dated.",
        ],
      },
    ],
    // у тексті немає розділу питань: сторінка не показує порожній FAQ і не дає розмітки FAQPage
    faq: [],
    sources: [SOURCES.creeRoatan, SOURCES.creeRecoSummary, SOURCES.maxcom],
    related: ['best-areas-to-live-in-roatan', 'west-end-vs-west-bay', 'is-roatan-safe', 'roatan-closing-costs'],
  },
  {
    slug: 'west-end-vs-west-bay',
    title: "West End vs West Bay: Where Should You Live or Buy?",
    seoTitle: "West End vs West Bay: Where to Live",
    short: "West End vs West Bay",
    description: "Compare West End vs West Bay for living or buying: named property examples, access, community fees and a practical viewing checklist.",
    published: '2026-11-13',
    updated: '2026-11-13',
    // у тексті: «Listing examples checked November 12, 2026»
    checked: '2026-11-12',
    author: {
      name: "Taras Chaus",
      role: "CBDO at Hogarli",
      bio: "**About the author:** Taras Chaus is CBDO at Hogarli.",
    },
    // дужки в адресі Commons закодовано: Rich обриває посилання на першій «)»
    hero: {
      src: "/photos/guides/west-end-waterfront-2016-10-26.webp",
      alt: "West End waterfront with piers and small boats, Roatán",
      width: 1600,
      height: 797,
      caption: "West End waterfront, October 26, 2016. Historical area view. [West End ~ Isla Roatan](https://commons.wikimedia.org/wiki/File:West_End_~_Isla_Roatan_%2831392663941%29.jpg) · Prayitno / Thank you for (12 millions +) view · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Resized and converted to WebP.",
    },
    answer: "**West End vs West Bay** is a choice between two different home bases, not a contest with one winner. West End puts a village of restaurants and dive businesses around Half Moon Bay at the centre of the search. West Bay puts the beach, resort setting and nearby condo buildings at the centre. The better choice depends on the actual home, your daily routes and its recurring costs.",
    sections: [
      {
        h: "The differences that matter for a home",
        body: [
          "Start with the area character, then compare individual properties. A home marketed under an area name may be outside the part you intend to walk around.",
          {
            table: {
              head: ["Priority", "West End: what to investigate", "West Bay: what to investigate"],
              rows: [
                ["Setting", "Village streets and Half Moon Bay", "Beachfront, resort setting and hillside homes"],
                ["Daily routine", "Walking route to the services you use", "Route from the particular building to shops and transport"],
                ["Housing", "Houses and condos in or around the village", "Beach-area condos, managed buildings and houses"],
                ["Access", "Parking, hills and the last part of the route home", "Hillside access, parking and any shared access arrangements"],
                ["Recurring costs", "Actual bills and any community charges", "Actual bills, community fees and included services"],
              ],
            },
          },
          "Hogarli's [West End](/areas/west-end) and [West Bay](/areas/west-bay) pages provide the area descriptions and current inventory behind this comparison. Use them to choose viewings, not to assume every home in an area has the same features.",
        ],
      },
      {
        h: "Is West End or West Bay cheaper?",
        body: [
          "The advertised price alone does not establish that one area is always cheaper. Here are four named examples displayed on Hogarli's area pages on November 12, 2026, in US dollars:",
          {
            table: {
              head: ["Area and advertised property", "Type and size", "Asking price"],
              rows: [
                ["West End: Banana House at Sunset Villas", "3-bedroom house, 265 m²", "US$499,000 for sale"],
                ["West Bay: top-floor condo 141 at Acqua di Mare", "2-bedroom condo, 123 m²", "US$510,000 for sale"],
                ["West End: condo 12K at Sunset Villas", "2 bedrooms, 2 bathrooms", "US$900/month for rent"],
                ["West Bay: upper unit at Tortuga Bahia", "2 bedrooms, 1 bathroom", "US$900/month for rent"],
              ],
            },
          },
          "Sources: [West End inventory](/areas/west-end) and [West Bay inventory](/areas/west-bay). This is a selection of four offers, not a representative market sample or completed-sale record. Confirm availability, lease terms, property details and included services with the listing agency.",
          "The sale examples differ in building type, size and facilities, so they do not measure an area premium. The rental examples have the same asking rent but different bathrooms and potentially different inclusions. Compare the home you would actually choose, including the costs outside its headline price.",
          "Use our [cost-of-living budget guide](/guides/cost-of-living-in-roatan) to compare utilities, transport and other monthly costs alongside rent.",
        ],
      },
      {
        h: "Living in West End: check the village-to-home route",
        body: [
          "If the village setting appeals to you, walk from the specific home to the places you expect to use. A property near West End is not necessarily on a level, convenient route into the village. Check hills, road surface, lighting, parking and where a taxi can drop you.",
          "Ask about normal activity near the home and visit at the times that matter to your routine, where practical. Do not assume an area label tells you how quiet a particular bedroom will be.",
          "Be precise about location. Hogarli's West End page also includes listings labelled Gibson Bight; a broader search grouping is not the same thing as being in the village.",
        ],
      },
      {
        h: "Living in West Bay: check the building as well as the beach",
        body: [
          {
            image: {
              src: "/photos/guides/west-bay-beach-2009-05-23.webp",
              alt: "Palm-frond canopy, sand and turquoise sea at West Bay Beach, Roatán",
              width: 1400,
              height: 1200,
              caption: "West Bay Beach, May 23, 2009. Historical beach view. [West Bay Beach - Roatan, Honduras](https://commons.wikimedia.org/wiki/File:West_Bay_Beach_-Roatan_-Honduras-23May2009-c.jpg) · Adalberto Hernandez Vega · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Cropped, resized and converted to WebP.",
            },
          },
          "For a condo, ask for the current community fee, what it includes and what you pay separately. Review the arrangements for maintenance, shared facilities, insurance and property management. Do not assume every building offers the same services.",
          "For either a condo or a house, check the real route between the property, the beach and your transport. A beach-area address does not by itself establish beachfront ownership or a particular access right. Have your independent adviser check any access arrangements relevant to the purchase.",
          "If you plan to rent the home out, obtain the actual building rules, management terms and property-specific operating records. A location description is not evidence of occupancy or future rental income.",
        ],
      },
      {
        h: "Walkability, transport and evenings",
        body: [
          "Make a short list of the trips you will repeat: groceries, work, appointments, school if relevant, and evenings out. Test those routes from each shortlisted home and ask for transport options and prices.",
          "Do not base a daily commute on an assumed water-taxi timetable or a travel time from a holiday visit. Confirm current operating arrangements and an alternative for the journeys you need.",
          "For after-dark precautions and published emergency contacts, use our [Roatán safety guide](/guides/is-roatan-safe). This comparison does not rank either neighbourhood as safer.",
        ],
      },
      {
        h: "A viewing checklist for both areas",
        body: [
          { list: [
              "Confirm the exact location, not only the listing's area label.",
              "Walk or drive the approach and check parking and drop-off arrangements.",
              "Ask for recent utility bills and the list of included services.",
              "Obtain current community fees and maintenance responsibilities.",
              "Test the internet connection if you will work from home.",
              "Confirm rental restrictions if letting the property is part of your plan.",
              "Compare the complete costs of two real homes before choosing an area.",
            ] },
          "Use the [rent-before-buying guide](/blog/renting-in-honduras-before-you-buy) if you want to test a location first, and the [buying guide](/guides/how-to-buy-property-in-roatan) for the purchase process.",
        ],
      },
      {
        h: "Which should you shortlist?",
        body: [
          "Start with **West End** if your main question is whether village life fits your daily routine. Start with **West Bay** if you want to compare beach-area homes and condo-building services. In either case, choose the particular home only after checking its access, terms and ongoing costs.",
          "If neither fits, widen the search using the [island-wide area guide](/guides/best-areas-to-live-in-roatan). Browse [homes for sale](/listings?deal=sale) or [rentals](/listings?deal=rent), checking each property's location; the general search also includes mainland Honduras.",
        ],
      },
    ],
    // у тексті немає розділу питань і зовнішніх джерел: приклади цін — зі сторінок зон Hogarli
    faq: [],
    sources: [SOURCES.hogarliWestEnd, SOURCES.hogarliWestBay],
    related: ['best-areas-to-live-in-roatan', 'cost-of-living-in-roatan', 'is-roatan-safe', 'how-to-buy-property-in-roatan'],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
