import type { Guide } from './guides';
import { SOURCES } from './sources';

/**
 * Гайди для діаспори й материка: купівля зі США, кредити для гондурасців за кордоном,
 * Сан-Педро-Сула, Тегусігальпа і шахрайство. Відповідають на питання, які ставлять
 * ChatGPT/Perplexity англійською й іспанською; кожна цифра — з джерела в `sources`.
 * Іспанський переклад — lib/i18n/es/guidesHonduras.ts.
 */
const DISCLAIMER = 'This guide is general information, not legal, tax or financial advice. Fees, rates and rules change; confirm every step with a Honduran attorney (abogado y notario) or your bank before you pay anything.';

export const HONDURAS_GUIDES: Guide[] = [
  {
    slug: 'buy-property-in-honduras-from-the-usa',
    title: 'How to buy a house in Honduras from the USA: power of attorney, costs and risks',
    short: 'Buying from the USA',
    description: 'Buying a home in Honduras while you live in the United States: the consular power of attorney, registry checks, fees and the scams that target Hondurans abroad.',
    published: '2026-10-16',
    updated: '2026-10-16',
    answer: 'Yes, you can buy a house in Honduras without travelling. The usual way is to give a person you trust, or your lawyer, a special power of attorney (poder especial) at a Honduran consulate in the US, which costs US$200. Your representative signs the deed before a Honduran notary and the sale is registered at the Instituto de la Propiedad. Check the title and liens at the Instituto de la Propiedad before you send any money.',
    keyFacts: [
      'A special power of attorney at a Honduran consulate costs US$200; a general one costs US$150 (Miami consulate, 2025).',
      'The seller pays the 1.5% property transfer tax, due within 3 days of signing the deed.',
      'Registering a sale at the Instituto de la Propiedad costs L200 plus L1.50 per thousand lempiras of value; registering a power of attorney costs L200.',
      'In 2017 prosecutors documented 75 cases in which gangs sold houses belonging to Hondurans living in the United States.',
    ],
    sections: [
      {
        h: 'Step by step',
        body: [
          { ordered: true, list: [
            'Choose the property and ask the seller for a copy of the deed (escritura) and its registry details.',
            'Order a **certificación íntegra** (L300) and a **constancia de libertad de gravamen** (L200) from the Instituto de la Propiedad. They show the registered owner, the title history and any mortgages or liens.',
            'Hire a Honduran lawyer and notary (abogado y notario) you chose yourself, not one sent by the seller.',
            'Grant a **poder especial** at a Honduran consulate. Bring your DNI or passport, your representative’s full details (and their Colegio de Abogados number if they are a lawyer) and a copy of the deed or an exact description of the property. Consulates in the US take money orders, not cash.',
            'In Honduras the original power of attorney is authenticated at the Foreign Ministry (Cancillería, L150, about one day) and registered at the Instituto de la Propiedad (L200).',
            'Your representative signs the deed of sale before the notary. The seller pays the 1.5% transfer tax and the notary registers the deed.',
            'Ask for the registered deed and a new certificación íntegra in your name.',
          ] },
        ],
      },
      {
        h: 'Consulate or a US notary?',
        body: [
          'The consular route above is the one Honduran consular authorities describe for property purchases. Honduras and the United States are both members of the [Hague Apostille Convention](https://www.hcch.net/en/instruments/conventions/status-table/print/?cid=24), so a document signed before a US notary can be apostilled for use in Honduras.',
          { note: 'We could not find an official rule on whether the property registry accepts a US-notarized, apostilled power of attorney as it is, or what translation it needs. Ask your Honduran notary before you choose this route.' },
        ],
      },
      {
        h: 'Paying from the United States',
        body: [
          { list: [
            'Never send a deposit before the title check is done.',
            'Pay only to an account in the name of the registered owner, and keep every transfer receipt.',
            'Ask your notary in writing how the money is protected until the deed is registered.',
            'Some Honduran banks let you open an account from abroad. Banco Atlántida, for example, opens savings accounts for Hondurans in the US and Spain through its app with a passport or DNI.',
          ] },
        ],
      },
      {
        h: 'Risks for Hondurans abroad',
        body: [
          'Owners who live abroad are a known target. In 2017 the Ministerio Público investigated networks that moved into houses owned by Hondurans in the US as tenants, put the utilities in their own names, presented false ownership papers and sold the houses through a notary. One buyer lost L2.5 million.',
          { list: [
            'Limit the power of attorney to one property and one operation, and set an end date.',
            'Choose a representative you trust, and ask for copies of every document they sign.',
            'If you already own property in Honduras, order a certificación íntegra from time to time to see whether anything has changed.',
          ] },
          'More on spotting fraud: [real-estate scams in Honduras](/guides/honduras-real-estate-scams).',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'Can I buy a house in Honduras without travelling?', a: 'Yes. Give a person you trust or your lawyer a special power of attorney at a Honduran consulate. They sign the deed in Honduras on your behalf and the notary registers the sale at the Instituto de la Propiedad.' },
      { q: 'How much does a power of attorney cost at a Honduran consulate?', a: 'A special power of attorney (poder especial) costs US$200 and a general one US$150, according to the Honduran consulate in Miami in 2025. Registering it in Honduras adds L200.' },
      { q: 'Who pays the transfer tax when buying a house in Honduras?', a: 'The seller. The property transfer tax is 1.5% of the higher of the sale price and the cadastral value, and it is due within 3 days of signing the deed.' },
      { q: 'Can I get a home loan while living in the US?', a: 'Yes, through Banhprovi funds offered by Honduran banks. See [home loans for Hondurans living abroad](/guides/honduras-home-loans-for-hondurans-abroad).' },
    ],
    sources: [SOURCES.consulMiami, SOURCES.poderConsular, SOURCES.hcchApostille, SOURCES.ipFees, SOURCES.sarTradicion, SOURCES.scam2017, SOURCES.atlantidaAbroad],
    related: ['honduras-home-loans-for-hondurans-abroad', 'honduras-real-estate-scams', 'buying-property-in-san-pedro-sula'],
  },
  {
    slug: 'honduras-home-loans-for-hondurans-abroad',
    title: 'Home loans for Hondurans living abroad: Banhprovi rates and requirements in 2026',
    short: 'Home loans from abroad',
    description: 'How Hondurans in the United States can finance a home in Honduras: Banhprovi rates for 2026, the documents banks ask for and how they compare with RAP and regular mortgages.',
    published: '2026-10-16',
    updated: '2026-10-16',
    answer: 'Hondurans living abroad can finance a home in Honduras with Banhprovi funds, the state housing bank’s money lent through Honduran banks; Banhprovi has also taken applications at mobile consulates in US cities. In 2026 the rate is 4% for social housing up to L1.3 million and 7% for middle-class housing up to L4 million, over up to 30 years. Regular bank mortgages averaged about 12.4% in February 2026.',
    keyFacts: [
      'Banhprovi in 2026: 4% for homes up to L1.3 million and 7% up to L4 million, with terms of up to 30 years.',
      'A L2 million loan at 7% costs about L13,306 a month before insurance, which adds roughly L600 to L1,200.',
      'The average bank housing rate was 12.37% in February 2026, down from 15.61% (Banco Central de Honduras).',
      'RAP housing loans cost 9% to 10.5%, up to L5 million over up to 30 years.',
    ],
    sections: [
      {
        h: 'How Banhprovi loans work for migrants',
        body: [
          'Banhprovi does not lend to you directly: its funds reach buyers through Honduran banks and other intermediaries. In November 2024 it offered Hondurans in the United States loans at 4% over 30 years for homes of up to L1.3 million, taking applications at mobile consulates.',
          'An earlier round drew more than 300 applications in the US. Many applicants already owned land in Honduras and wanted to build on it.',
        ],
      },
      {
        h: 'Rates compared',
        body: [
          { table: { head: ['Option', 'Rate', 'Maximum', 'Term'], rows: [
            ['Banhprovi, social housing', '4%', 'L1.3 million', 'up to 30 years'],
            ['Banhprovi, middle-class housing', '7%', 'L4 million', 'up to 30 years'],
            ['RAP', '9% – 10.5%', 'L5 million', 'up to 30 years'],
            ['Bank mortgage, average', '12.37%', 'set by the bank', 'set by the bank'],
          ] } },
          'Banhprovi and RAP figures are for 2026; the bank average is for February 2026.',
        ],
      },
      {
        h: 'Documents banks asked for',
        body: [
          'The November 2024 programme for Hondurans in the US listed nine requirements. Among them:',
          { list: [
            'The property deed registered at the Instituto de la Propiedad, with a certificate that it is free of liens (libertad de gravamen).',
            'A valuation by an appraiser recognised by the banking regulator (CNBS).',
            'Six months of bank statements or pay stubs.',
            'A power of attorney registered at the Instituto de la Propiedad for the person who will sign for you in Honduras.',
          ] },
          'Requirements change from one programme to the next, so ask the bank for the current list before you gather papers. How to grant the power of attorney: [buying a house in Honduras from the USA](/guides/buy-property-in-honduras-from-the-usa).',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    faq: [
      { q: 'Can I get a mortgage in Honduras if I live in the United States?', a: 'Yes. Honduran banks lend Banhprovi funds to Hondurans abroad, and Banhprovi has taken applications at mobile consulates in US cities. You usually need a representative in Honduras with a registered power of attorney.' },
      { q: 'What is the Banhprovi interest rate in 2026?', a: '4% for social housing up to L1.3 million and 7% for middle-class housing up to L4 million, with terms of up to 30 years.' },
      { q: 'Do I need a down payment?', a: 'It depends on the programme and the bank. An earlier Banhprovi round for migrants was advertised with no down payment; ask the bank what the current programme requires.' },
      { q: 'How much is the monthly payment on a L2 million loan?', a: 'About L13,306 a month at 7% over 30 years, before insurance, which adds roughly L600 to L1,200 a month.' },
    ],
    sources: [SOURCES.banhprovi2026, SOURCES.banhproviMigrants, SOURCES.banhprovi2023, SOURCES.rapBanhprovi, SOURCES.bankRates2026],
    related: ['buy-property-in-honduras-from-the-usa', 'buying-property-in-san-pedro-sula', 'buying-property-in-tegucigalpa'],
  },
  {
    slug: 'buying-property-in-san-pedro-sula',
    title: 'Buying property in San Pedro Sula: prices, areas and flood risk in 2026',
    short: 'Buying in San Pedro Sula',
    description: 'What houses and land cost in San Pedro Sula, which areas are most sought after, how gated communities work and how to check flood risk before you buy.',
    published: '2026-10-16',
    updated: '2026-10-16',
    region: 'San Pedro Sula',
    answer: 'In San Pedro Sula the cheapest houses start around L2.5 million, and houses in the southwest and northwest start around L4 million (La Prensa, September 2025). Land averages about US$450 per square vara and costs US$475 to US$600 in El Potosí, Bellavista and El Pedregal. Most new building is in the northwest and southwest. Before buying, check the flood history: low-lying areas lost up to 70% of their value after storms Eta and Iota in 2020.',
    keyFacts: [
      'The cheapest houses cost about L2.5 million; in nearby Choloma and Villanueva, L1.5 to 2 million.',
      'Land averages about US$450 per square vara (1 vara² ≈ 0.7 m²); El Pedregal about US$600.',
      'About 35 projects were under way in mid-2026, including 15 to 20 towers, mostly in the northwest and southwest.',
      'After Eta and Iota, houses in flooded low-lying areas lost up to 70% of their value.',
    ],
    sections: [
      {
        h: 'Prices',
        body: [
          { table: { head: ['What', 'Price', 'Date'], rows: [
            ['Cheapest house in the city', 'about L2.5 million', 'Sep 2025'],
            ['House in the southwest or northwest', 'from about L4 million', 'Sep 2025'],
            ['House in Choloma or Villanueva', 'L1.5 – 2 million', 'Sep 2025'],
            ['Land, city average', 'about US$450 per vara²', 'Sep 2025'],
            ['Land in El Potosí / Bellavista / El Pedregal', 'US$475 / 550 / 600 per vara²', 'Sep 2025'],
          ] } },
          'Current asking prices per m² from open listings are in the [Hogarli Price Index](/market/price-index).',
        ],
      },
      {
        h: 'Where people buy',
        body: [
          'The northwest, at the foot of the Merendón mountains, has long been the most expensive part of the city: lower Río de Piedras and Colonia Trejo led land prices in 2019. Gated residenciales such as Casa Maya, La Foresta, Bugambilia, El Potosí, El Pedregal, Merendón Hills, Villas Mackey, Ciudad Maya, Portofino, Ciudad Jaraguá and Bosques del Merendón are among the best known.',
          'New towers and projects are concentrated in the northwest and southwest. The Banco Central de Honduras is reported to rank San Pedro Sula first in private construction.',
        ],
      },
      {
        h: 'Security and gated communities',
        body: [
          'Buyers in San Pedro Sula treat guards and CCTV as essential. In 2019 about 112 of the city’s 641 neighbourhoods had restricted access with gates or barriers, Jardines del Valle among them. The police said at the time that closing public streets is not legal, so ask who manages the gate, what the monthly fee is and whether the closure has a permit.',
        ],
      },
      {
        h: 'Flood risk',
        body: [
          'The Sula valley floods. A year after storms Eta and Iota in November 2020, houses in the worst-hit low areas had lost up to 70% of their value. Areas named in reports include lower Chamelecón, Céleo González, Rivera Hernández, La Planeta in La Lima and parts of Choloma.',
          { list: [
            'Ask the seller and the neighbours whether the house flooded in 2020, and how deep the water was.',
            'Look for water marks on walls and new paint low on the walls.',
            'Compare the street level with the nearest river or drainage channel.',
          ] },
        ],
      },
      {
        h: 'Before you sign',
        body: [
          'Check the title and liens at the Instituto de la Propiedad and use your own notary; see [real-estate scams in Honduras](/guides/honduras-real-estate-scams). Buying from abroad? Read [how to buy from the USA](/guides/buy-property-in-honduras-from-the-usa).',
          { note: DISCLAIMER },
        ],
      },
    ],
    faq: [
      { q: 'How much does a house cost in San Pedro Sula?', a: 'The cheapest houses in the city start around L2.5 million, and houses in the southwest and northwest start around L4 million, according to La Prensa in September 2025. Choloma and Villanueva are cheaper, at L1.5 to 2 million.' },
      { q: 'What are the most expensive areas of San Pedro Sula?', a: 'The northwest near the Merendón: Río de Piedras, Colonia Trejo, El Pedregal, Bellavista and El Potosí, plus gated residenciales such as Merendón Hills and Bosques del Merendón.' },
      { q: 'Which areas of San Pedro Sula flooded with Eta and Iota?', a: 'Reports name lower Chamelecón, Céleo González, Rivera Hernández, La Planeta in La Lima and parts of Choloma. Houses in the worst-hit low areas lost up to 70% of their value.' },
    ],
    sources: [SOURCES.spsPrices2025, SOURCES.spsLand2019, SOURCES.spsBuild2026, SOURCES.spsGated, SOURCES.spsFloods],
    related: ['buying-property-in-tegucigalpa', 'buy-property-in-honduras-from-the-usa', 'honduras-real-estate-scams'],
  },
  {
    slug: 'buying-property-in-tegucigalpa',
    title: 'Buying property in Tegucigalpa: best areas, prices and landslide risk',
    short: 'Buying in Tegucigalpa',
    description: 'The most sought-after areas of Tegucigalpa, what apartments and land have cost, where the city sees landslide risk and how to find current prices.',
    published: '2026-10-16',
    updated: '2026-10-16',
    region: 'Tegucigalpa',
    answer: 'Tegucigalpa’s most sought-after areas are in the east and northeast of the capital: Lomas del Guijarro, San Ignacio, El Hatillo, Las Hadas, Las Uvas and Lomas del Mayab, where most apartment towers are going up. Current asking prices per m² from open listings are in the Hogarli Price Index. The key check in the capital is landslide risk: the city counts 17 landslide zones covering 70 colonias, including La Guillén and El Berrinche.',
    keyFacts: [
      'Exclusive areas such as Lomas del Guijarro, Tepeyac and El Hatillo had land at L5,000 to 7,000 per square vara in 2019; the south (Loarque, Guacerique) L2,500 to 3,000.',
      'Apartments in new towers cost US$1,200 to 3,000 per m² in 2018, according to the construction chamber.',
      'About 200,000 people live in the 17 landslide zones mapped by the city.',
      'Towers of 18 to 22 floors are going up as land becomes more expensive.',
    ],
    sections: [
      {
        h: 'Where to live',
        body: [
          { table: { head: ['Neighbourhood', 'What to know'], rows: [
            ['Lomas del Guijarro, Tepeyac, El Trapiche, San Ignacio, El Hatillo', 'The most exclusive areas; the highest land prices'],
            ['Las Hadas, Las Uvas, El Sauce', 'Upper-middle and upscale residential areas'],
            ['Lomas del Mayab, Bulevar Morazán, Bulevar Suyapa, Los Próceres, Miraflores', 'Where most apartment towers are built'],
            ['Las Uvas, Roble Oeste', 'Rising in value in 2019'],
            ['Loarque, Guacerique (south)', 'Lower land prices'],
            ['La Alameda, El Prado, the centre', 'Values falling in 2019 because of security and flooding'],
          ] } },
        ],
      },
      {
        h: 'Apartments and towers',
        body: [
          'High land prices have pushed developers to build up. In 2018 the construction chamber put new tower apartments at US$1,200 to 3,000 per m², and towers of 18 to 22 floors have since gone up in the Distrito Central. These are older figures: see current asking prices in the [Hogarli Price Index](/market/price-index).',
        ],
      },
      {
        h: 'Landslide risk',
        body: [
          'Tegucigalpa is built on hills, and the city’s risk management office counts 17 landslide zones that cover 70 colonias, home to about 200,000 people. Areas named include El Berrinche (residents relocated in 1998), La Guillén (more than 700 people affected in 2022), Nueva Santa Rosa, El Reparto, Villa Delmi, Ciudad del Ángel, El Bosque, El Rincón and La Cabaña.',
          { list: [
            'Ask the municipality whether the lot is inside a mapped risk zone before you sign.',
            'Look for cracks in walls and floors, leaning walls and retaining walls that bulge.',
            'Ask the neighbours what happened in heavy rains.',
          ] },
        ],
      },
      {
        h: 'Before you sign',
        body: [
          'Check the title and liens at the Instituto de la Propiedad and use your own notary; see [real-estate scams in Honduras](/guides/honduras-real-estate-scams).',
          { note: DISCLAIMER },
        ],
      },
    ],
    faq: [
      { q: 'What are the best areas to live in Tegucigalpa?', a: 'The most sought-after areas are in the east and northeast: Lomas del Guijarro, San Ignacio, El Hatillo, Las Hadas, Las Uvas, Tepeyac and Lomas del Mayab.' },
      { q: 'How much does an apartment cost per m² in Tegucigalpa?', a: 'The construction chamber put new tower apartments at US$1,200 to 3,000 per m² in 2018. For current asking prices, see the Hogarli Price Index, calculated monthly from open listings.' },
      { q: 'Which colonias of Tegucigalpa have landslide risk?', a: 'The city maps 17 landslide zones covering 70 colonias, including El Berrinche, La Guillén, Nueva Santa Rosa, El Reparto, Villa Delmi, Ciudad del Ángel, El Bosque, El Rincón and La Cabaña.' },
    ],
    sources: [SOURCES.tgcLand2019, SOURCES.tgcUpscale, SOURCES.tgcTowers, SOURCES.tgcRisk],
    related: ['buying-property-in-san-pedro-sula', 'buy-property-in-honduras-from-the-usa', 'honduras-real-estate-scams'],
  },
  {
    slug: 'honduras-real-estate-scams',
    title: 'Real-estate scams in Honduras and how to check a property before you pay',
    short: 'Avoiding scams',
    description: 'The property scams reported in Honduras, from fake Facebook listings to lots sold seven times, and the registry checks that protect you.',
    published: '2026-10-16',
    updated: '2026-10-16',
    answer: 'The most common property scams in Honduras are fake listings on social media using photos of other people’s homes, the same lot sold to several buyers, houses of owners living abroad sold with false papers, and lots on ejido or national land sold with a promise of papers later. Protect yourself with a certificación íntegra and a libertad de gravamen from the Instituto de la Propiedad, municipal checks, and a notary you chose yourself, and never pay a deposit before those checks.',
    keyFacts: [
      'One lot was “sold” to seven different people, with deposits of L500,000 to L1.5 million.',
      'In September 2025 prosecutors charged a man who sold land and houses through Facebook ads and collected more than L2 million.',
      'A US government report cited estimates that about 80% of private land in Honduras is untitled or wrongly titled.',
      'A certificación íntegra costs L300 and a libertad de gravamen L200 at the Instituto de la Propiedad.',
    ],
    sections: [
      {
        h: 'Common schemes',
        body: [
          { list: [
            '**Fake listings.** Scammers pose as owners and post homes they do not own on social media, using other people’s photos, then ask for a deposit.',
            '**One lot, many buyers.** The same lot is sold to several people, each paying a deposit.',
            '**Houses of owners abroad.** People move in as tenants, put the utilities in their names, forge ownership papers and sell the house.',
            '**Ejido or national land.** Lots on municipal (ejido) or national land are sold with a promise of “papers later”. Without a municipal document the buyer gets nothing.',
            '**Too-good deals with pressure.** A low price and a demand to pay today so you “do not lose it”.',
          ] },
        ],
      },
      {
        h: 'How to check a property',
        body: [
          { ordered: true, list: [
            'Ask for the deed and the registry number, and the seller’s DNI.',
            'Order a **certificación íntegra** (L300) from the Instituto de la Propiedad and compare the registered owner with the seller’s DNI.',
            'Order a **constancia de libertad de gravamen** (L200) to see mortgages, liens and seizures.',
            'Have your notary check the chain of title (tracto sucesivo): every past sale should be registered in order.',
            'Confirm with the municipality that the land is not ejido or national land, check the cadastre, and ask for the seller’s solvencia municipal.',
            'Sign before a notary you chose yourself and pay only after these checks, to an account in the registered owner’s name.',
          ] },
          'The Instituto de la Propiedad runs an online registry system (SURE), so a notary can usually pull these certificates without a trip to the office.',
        ],
      },
      {
        h: 'Red flags',
        body: [
          { list: [
            'The seller cannot meet you or will not show the original deed.',
            'The name on the registry certificate is not the seller’s, and there is no registered power of attorney.',
            'You are asked to pay a deposit by transfer to a third person or in cash before any check.',
            'The price is far below similar homes in the area. Compare with the [Hogarli Price Index](/market/price-index).',
          ] },
        ],
      },
      {
        h: 'How Hogarli helps',
        body: [
          'Every listing on Hogarli links to the agency that holds it, so you know who you are dealing with. Land listings carry a [land passport](/land-passport) that shows which facts about the title, access and utilities have been confirmed and when. If a listing looks wrong, use the report button on its page and our team will review it.',
          { note: DISCLAIMER },
        ],
      },
    ],
    faq: [
      { q: 'How do I know a property in Honduras is not sold twice?', a: 'Order a certificación íntegra and a libertad de gravamen from the Instituto de la Propiedad just before you pay, check that the registered owner matches the seller’s DNI, and have your own notary register the deed straight after signing.' },
      { q: 'What is ejido land?', a: 'Ejido land belongs to the municipality. Lots on ejido land are often sold with a promise of papers later; without a municipal title document the buyer acquires nothing.' },
      { q: 'Can I check the property registry online?', a: 'The Instituto de la Propiedad runs an online registry system called SURE. In practice your notary orders the certificación íntegra and libertad de gravamen for you.' },
      { q: 'What should I do if I was scammed?', a: 'File a complaint with the Ministerio Público and keep every message, receipt and transfer record. In 2025 prosecutors charged a man who sold properties through fake Facebook ads.' },
    ],
    sources: [SOURCES.scamSocial, SOURCES.scamFacebook2025, SOURCES.scam2017, SOURCES.ejidoSale, SOURCES.usLand2026, SOURCES.ipFees, SOURCES.ipSure],
    related: ['buy-property-in-honduras-from-the-usa', 'how-to-check-land-title-in-roatan', 'buying-property-in-san-pedro-sula'],
  },
];
