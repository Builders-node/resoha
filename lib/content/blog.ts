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
    slug: 'houses-for-sale-in-tegucigalpa-neighbourhoods-and-prices',
    title: 'Houses for sale in Tegucigalpa: neighbourhoods, prices and what to check',
    description: 'Houses for sale in Tegucigalpa: the colonias buyers look at, indicative prices per m², house vs apartment vs residencial, and the water, hillside and title checks.',
    topic: 'market',
    icon: 'building',
    published: '2026-10-18',
    updated: '2026-10-18',
    lead: 'Tegucigalpa is a city of hills, and where you buy on them shapes almost everything: the price, the commute, the water supply and the risk from landslides. This article covers the colonias buyers look at most, what homes cost per square metre according to published estimates, and the checks to run before you pay a deposit.',
    takeaways: [
      'Demand and prices are highest in the south-east colonias such as Lomas del Guijarro, Lomas del Mayab and Los Próceres; El Hatillo, Santa Lucía and Valle de Ángeles offer more space and cooler air.',
      'Published estimates for June 2026 put the citywide median at about L 42,000 per m², with a wide gap between the most and least expensive colonias.',
      'Check the water first: in August 2026 the city was rationing mains water on a nine-day cycle, so a cistern is close to essential.',
      'Check hillside stability, the commute and the title at the Instituto de la Propiedad before you pay anything.',
    ],
    sections: [
      {
        h: 'Where buyers look in Tegucigalpa',
        body: [
          'Tegucigalpa and Comayagüela together form the Distrito Central, the capital of Honduras. Most of the demand for houses and apartments comes from people who work in government, embassies, international organisations, banks and private companies, so the colonias closest to those offices are the most sought after.',
          { list: [
            '**Lomas del Guijarro, Lomas del Mayab and Los Próceres.** The south-east colonias near embassies, offices, malls and restaurants. Mostly apartment towers and houses in small gated circuits, and the most expensive part of the city.',
            '**Palmira, Tepeyac and Colonia Rubén Darío.** Older, central colonias near Boulevard Morazán, with a mix of family houses, offices and newer apartment buildings.',
            '**Altos de Las Lomas.** Hillside streets above the Lomas, with houses on larger lots and views over the valley.',
            '**El Hatillo.** Pine-covered hills north of the city, cooler and greener, with larger houses and residenciales. The road up is narrow and winding.',
            '**Santa Lucía and Valle de Ángeles.** Colonial hill towns on the road east, popular for weekend homes and with families who accept a longer drive.',
            '**Comayagüela.** The commercial twin city across the Choluteca River, with lower prices, busy markets and more mixed-use buildings.',
          ] },
          'See each colonia on the map in the [Tegucigalpa area guide](/areas/tegucigalpa), or browse [houses for sale in Tegucigalpa](/listings?island=Tegucigalpa&type=house).',
        ],
      },
      {
        h: 'House, apartment or gated residencial',
        body: [
          'Buyers in Tegucigalpa usually choose between three kinds of home. Each one trades space against security and running costs.',
          { table: {
            head: ['', 'House in an open colonia', 'Apartment', 'House in a gated residencial'],
            rows: [
              ['Who buys it', 'Families who want space and a garden', 'Professionals, couples, investors renting to expatriate staff', 'Families who want space with controlled access'],
              ['Security', 'Your own walls, gate and, often, a private guard', 'Building reception, guards and cameras', 'Guarded entrance and perimeter wall'],
              ['Water', 'Depends on your own cistern and pump', 'Usually a shared cistern run by the building', 'Often a shared tank or well run by the residencial'],
              ['Monthly costs', 'Maintenance and security you arrange yourself', 'HOA fee for guards, lifts, water and common areas', 'HOA fee for guards, roads and common areas'],
              ['Typical areas', 'Palmira, Tepeyac, Rubén Darío, Comayagüela', 'Lomas del Guijarro, Lomas del Mayab, Los Próceres', 'El Hatillo, Altos de Las Lomas, the roads to Santa Lucía and Valle de Ángeles'],
            ],
          } },
          'You can filter [apartments for sale](/listings?island=Tegucigalpa&type=condo) and [land for sale](/listings?island=Tegucigalpa&type=land) in Tegucigalpa the same way. If you buy a lot to build on, budget separately for the engineer, the municipal building permit and the retaining walls a sloping site may need.',
        ],
      },
      {
        h: 'What homes cost: indicative prices',
        body: [
          'There is no official house price index for Tegucigalpa. The LatInvestor publishes estimates based on listings: as of June 2026 it puts the citywide median at about L 42,000 per m² and the average at about L 48,000 per m². Its average total prices were about L 4.5 million for an apartment, L 5.8 million for a townhouse and L 7.2 million for a detached house.',
          { table: {
            head: ['Colonia', 'Typical price per m² (June 2026)'],
            rows: [
              ['Lomas del Guijarro', 'L 65,000 – 90,000'],
              ['Lomas del Mayab', 'L 55,000 – 80,000'],
              ['Palmira', 'L 42,000 – 60,000'],
              ['Tepeyac', 'L 40,000 – 58,000'],
              ['El Hatillo / Villa Elena', 'L 30,000 – 55,000'],
              ['Kennedy / Suyapa', 'L 18,000 – 32,000'],
            ],
          } },
          { note: 'These figures are estimates built from asking prices, not registered sales. Use them to spot a listing that is far out of line, then ask a local agent or a perito valuador (licensed valuer) for recent comparable sales.' },
          'The newest apartments in the south-east colonias usually carry the highest price per square metre. Houses on large lots in El Hatillo or on the road to Valle de Ángeles can cost less per square metre of building but more in total.',
        ],
      },
      {
        h: 'Water, hillsides and security: the practical checks',
        body: [
          { list: [
            '**Water.** In August 2026 the city moved mains supply to a nine-day cycle, with two to six hours of water depending on the zone, after La Concepción, the dam that supplies about 60% of the capital, fell to 30% of capacity. Residents of some colonias reported paying up to L 70 a barrel for water from private tanker trucks. Ask how big the cistern is, whether there is a pump or a well, and how often mains water actually arrives.',
            '**Hillsides.** In May 2026 the municipality said about 600 colonias and barrios in Tegucigalpa and Comayagüela were under watch for floods and landslides. Ask the seller and the neighbours how the lot behaves in the rainy season, look for cracks, leaning walls and blocked drainage, and have an engineer inspect any house on a steep slope.',
            '**Security.** Visit at night as well as by day. Check who controls access, whether there is a guard, what the HOA fee covers and whether the street feels lived in.',
            '**Commute.** Drive the route to work or school at rush hour before you decide. Streets are steep, the main boulevards jam, and a short distance on the map can take a long time.',
          ] },
        ],
      },
      {
        h: 'Title, paperwork and financing',
        body: [
          'Before you pay a deposit, have your own Honduran attorney pull the title and lien certificate from the Instituto de la Propiedad, confirm the seller is the registered owner and check that municipal property tax is paid. Never pay for a house you have not seen, or into an account that is not the owner’s; read [how to spot a property scam](/blog/how-to-spot-property-scams-in-honduras) first.',
          'Most Honduran buyers finance through a bank. As reported in April 2026, Banhprovi funds, offered through intermediary banks, carried 4% a year for loans up to L 1.3 million and 7% for homes valued between L 1.3 million and L 4 million, with terms of up to 30 years. RAP lent up to L 5 million at 9% for borrowers earning up to two minimum wages and 10.5% above that. Each bank sets its own down payment and credit criteria, so ask several.',
        ],
      },
      {
        h: 'Rent first if the city is new to you',
        body: [
          'If you are moving to Tegucigalpa for work, renting for a few months is the cheapest way to learn which colonias suit you, how the water supply behaves and how long the commute really takes. Browse [houses and apartments for rent in Tegucigalpa](/listings?island=Tegucigalpa&deal=rent) and read [rent first, buy later](/blog/renting-in-honduras-before-you-buy).',
          'Still deciding between cities? Compare the capital with the island and the business capital in [Roatán, San Pedro Sula or Tegucigalpa](/blog/roatan-san-pedro-sula-or-tegucigalpa).',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.latTguSqm, SOURCES.tguWaterRationing, SOURCES.tguWaterTrucks, SOURCES.tguLandslideRisk, SOURCES.rapBanhprovi, SOURCES.gpg],
    related: ['roatan-san-pedro-sula-or-tegucigalpa', 'renting-in-honduras-before-you-buy'],
    guides: ['how-to-check-land-title-in-roatan'],
  },
  {
    slug: 'houses-for-sale-in-san-pedro-sula-neighbourhoods-and-prices',
    title: 'Houses for sale in San Pedro Sula: neighbourhoods, prices and what to check',
    description: 'Houses for sale in San Pedro Sula: the colonias buyers look at, recent prices for houses, apartments and land, and what to check on floods, security and title.',
    topic: 'market',
    icon: 'home',
    published: '2026-10-18',
    updated: '2026-10-18',
    lead: 'San Pedro Sula is the business capital of Honduras, and most people buying a home there live and work in the city. Prices have risen fast in the last few years and good land is scarce. This article covers where buyers look, what recent reports say homes cost, and the checks that matter most in the Sula Valley: floods, security and title.',
    takeaways: [
      'Local reporting in 2025 put the entry price for a house in the city at about L 2.5 million, and from about L 4 million in the north-west and south-west.',
      'Apartments in the city’s new towers, many of them in Río de Piedras and Colonia Trejo, sold at roughly US$3,000 to US$3,800 per m² in early 2026.',
      'Parts of the valley flooded badly during Eta and Iota in November 2020. Ask how any property came through those storms.',
      'Have your own attorney check the title at the Instituto de la Propiedad before you pay a deposit, whatever the price.',
    ],
    sections: [
      {
        h: 'What homes cost in San Pedro Sula',
        body: [
          'There is no official price index for homes in Honduras, so the best guide is recent local reporting and the asking prices in current listings. In September 2025, La Prensa reported that buying and renting in San Pedro Sula had become much more expensive over about five years, with little land on offer and owners reluctant to sell. In March 2026 the same paper counted more than 20 towers under construction or in development in the city, over half of them residential.',
          { table: {
            head: ['Type of property', 'Reported price', 'Source and date'],
            rows: [
              ['House in the city, entry level', 'From about L 2.5 million', 'La Prensa, Sept 2025'],
              ['House in the north-west or south-west', 'From about L 4 million', 'La Prensa, Sept 2025'],
              ['New house in Choloma or Villanueva', 'From about L 1.5 million', 'La Prensa, Sept 2025'],
              ['Residential land, city average', 'About US$450 per vara²', 'La Prensa, Sept 2025'],
              ['Apartment in a new tower', 'US$3,000 to US$3,800 per m²', 'La Prensa, Mar 2026'],
              ['House for rent in the north-west', 'About US$1,000 to US$2,000 and up a month', 'La Prensa, Nov 2025'],
            ],
          } },
          'Land is still sold by the vara cuadrada, which is about 0.7 m². The same 2025 report put land in El Potosí at around US$475 per vara², Colonia Bellavista at about US$550 and El Pedregal at US$600. Treat all of these as starting points: the asking price of a specific house depends on the colonia, the lot, the state of the building and whether it sits inside a guarded residencial. Compare current [houses for sale in San Pedro Sula](/listings?island=San%20Pedro%20Sula&type=house) before you make an offer.',
        ],
      },
      {
        h: 'The colonias buyers look at',
        body: [
          'San Pedro Sula sits at the foot of the Merendón mountains, and the established residential areas run along the west and north-west side of the city, closer to the hills. A few names come up again and again:',
          { list: [
            '**Río de Piedras and Colonia Trejo**: central, close to offices, restaurants and private hospitals. Most of the new apartment towers and mixed-use projects are being built here.',
            '**Colonia Moderna and Los Álamos**: established residential colonias west and north-west of the centre, mostly houses, some behind gated streets.',
            '**Barrio Los Andes and Guamilito**: older central barrios where homes sit next to shops, offices and the city market. Good for walking to work, busier and noisier.',
            '**Juan Lindo**: east of the centre, a residential colonia with houses on regular blocks.',
            '**Jardines del Valle**: further north, larger lots and houses, a longer drive into the centre.',
          ] },
          'Safety and flood risk can change from one block to the next, so judge each street on its own. See the map and more detail on the [San Pedro Sula area page](/areas/san-pedro-sula).',
        ],
      },
      {
        h: 'House, apartment or gated residencial',
        body: [
          'Most families in San Pedro Sula still buy a house, and many look only inside a **residencial**: a gated development with one controlled entrance, guards and sometimes shared green areas. You pay a monthly fee for security and maintenance, but daily life is calmer. A house on an open street costs less but usually needs walls, bars and an alarm.',
          '**Apartments** are the fastest-growing part of the market. La Prensa reported in 2026 that buyers value private security and building services above most other features, and that developers are moving away from large houses with big yards towards compact units. The most exclusive units in some towers were priced from about US$450,000. Browse [apartments for sale in San Pedro Sula](/listings?island=San%20Pedro%20Sula&type=condo).',
          '**Land** makes sense if you want to build, but it is scarce and expensive inside the city. Check zoning with the municipality, and the flood history, before you buy a lot. See [land for sale in San Pedro Sula](/listings?island=San%20Pedro%20Sula&type=land).',
          { note: 'If you are moving to the city, renting for a few months first is a cheap way to learn the colonias. Rents in the north-west are often quoted in dollars. See [homes for rent in San Pedro Sula](/listings?island=San%20Pedro%20Sula&deal=rent).' },
        ],
      },
      {
        h: 'Check the flood history first',
        body: [
          'The Sula Valley is flat and crossed by the Ulúa and Chamelecón rivers. In November 2020 Hurricanes Eta and Iota hit Honduras two weeks apart, and both rivers overflowed. El Heraldo reported low-lying sectors of San Pedro Sula such as Chamelecón and Rivera Hernández under water, along with large parts of La Lima, Villanueva, El Progreso and the low areas of Choloma.',
          { list: [
            'Ask the seller and the neighbours directly: did water enter the house in 2020, and how high did it reach?',
            'Look for water marks on walls, new plaster at the same height in every room, or recently replaced doors and floors.',
            'Check whether the street drains well in an ordinary heavy rain, not only in a hurricane.',
            'Ask your insurer whether flood cover is available for that address, and at what price.',
          ] },
          'The colonias on the higher ground towards the Merendón generally flood less than the low east and south of the valley, but slopes bring their own risks in heavy rain. More on storms and property in [hurricane season and your property](/blog/hurricane-season-and-property-on-the-bay-islands).',
        ],
      },
      {
        h: 'Security, title and paperwork',
        body: [
          'Security is the first question most buyers in San Pedro Sula ask. Visit the colonia in the morning, after dark and at the weekend, ask how access is controlled, and talk to people who live there. A residencial’s monthly fee and the condition of its walls and gate tell you a lot about how well it is run.',
          'For the paperwork, the rules are the same as anywhere in Honduras. Your own attorney should pull the property’s record at the Instituto de la Propiedad, confirm that the seller is the registered owner, and check for mortgages, liens and unpaid municipal taxes. Never pay a deposit to someone you have not identified, and be wary of prices that look too low for the colonia. Read [how to spot a fake listing or property scam](/blog/how-to-spot-property-scams-in-honduras) before you send money.',
        ],
      },
      {
        h: 'Heat, power and getting around',
        body: [
          'San Pedro Sula is hot and humid all year, so air conditioning is a running cost, not a luxury. Ask to see recent electricity bills, check the age of the AC units, and ask about power cuts in the colonia and whether the house has a generator, inverter or solar panels. A cistern and pump help when mains water pressure drops.',
          'Traffic on the main boulevards is heavy at rush hour, so test the drive to work and school at the times you would actually make it. Ramón Villeda Morales International Airport (SAP), the busiest in Honduras, lies east of the city on the road to La Lima, which makes the east side convenient for frequent flyers. If you are still choosing a city, compare in [Roatán, San Pedro Sula or Tegucigalpa](/blog/roatan-san-pedro-sula-or-tegucigalpa).',
        ],
      },
      {
        h: 'Looking beyond the city: Choloma, Villanueva, La Lima and El Progreso',
        body: [
          'Many buyers priced out of San Pedro Sula look at the towns around it in the Sula Valley. Choloma to the north and Villanueva to the south have large new housing developments, and La Prensa reported new houses there from about L 1.5 million in 2025. La Lima sits next to the airport, and El Progreso is a separate city to the east on the Ulúa.',
          'Lower prices come with longer commutes and, in several of these towns, a higher flood risk: all four had flooded areas in 2020. Apply the same checks there as in the city.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.laprensaSpsPrices, SOURCES.laprensaSpsTowers, SOURCES.laprensaSpsRents, SOURCES.heraldoIotaSula, SOURCES.nhcEta, SOURCES.nhcIota],
    related: ['roatan-san-pedro-sula-or-tegucigalpa', 'how-to-spot-property-scams-in-honduras'],
    guides: ['how-to-check-land-title-in-roatan'],
  },
  {
    slug: 'housing-bonus-and-mortgages-in-honduras',
    title: 'Housing bonus and mortgages in Honduras: how to finance a home in 2026',
    description: 'Mortgage in Honduras explained: bank loans, Banhprovi and RAP funds, the 2026 housing bonus, owner financing and what foreigners can realistically get.',
    topic: 'buying',
    icon: 'wallet',
    published: '2026-10-18',
    updated: '2026-10-18',
    lead: 'Most Hondurans who buy a home combine a down payment with a long-term loan, and the cheapest loans come from public funds channelled through banks and cooperatives. Foreign buyers have fewer options and usually pay cash or use developer financing. This guide explains each route, what it cost in 2026 and what the bank will ask you for.',
    takeaways: [
      'Banhprovi funds offered the lowest rates in 2026: 4% for social housing and 7% for middle-class homes, up to 30 years, but the money ran short in mid-2026.',
      'RAP affiliates with 12 months of continuous contributions can borrow for a home at 9% or 10.5%, depending on income.',
      'The new housing subsidies announced by the Secretaría de Vivienda in 2026 were still a proposal in July 2026. Check what is in force before you count on a bono.',
      'Foreigners can get bank mortgages, but expect a down payment of 30% or more. Most Roatán purchases are cash or developer-financed.',
    ],
    sections: [
      {
        h: 'How home financing works in Honduras',
        body: [
          'There are four main ways to finance a home: a regular bank mortgage, a loan from a bank or cooperative using Banhprovi funds, a housing loan with RAP funds, and financing straight from the owner or developer. Public programmes can add a bono (a one-off subsidy) on top of a loan for lower-income families.',
          'Loans in lempiras are the norm for local buyers, and the cheap public lines are in lempiras. Banks also lend in US dollars, mostly to buyers with dollar income. A dollar loan can carry a lower rate, but if you earn in lempiras you take the exchange-rate risk.',
          {
            table: {
              head: ['Option', 'Who it suits', 'Rate (2026)', 'Watch out for'],
              rows: [
                [
                  'Bank mortgage',
                  'Buyers with stable, provable income',
                  'About 12% average for real-estate loans in lempiras',
                  'Higher rates, rate reviews over the loan',
                ],
                [
                  'Banhprovi funds',
                  'Social and middle-class housing',
                  '4% or 7%',
                  'Limited funds, slower processing',
                ],
                [
                  'RAP housing loan',
                  'RAP affiliates with 12 months of contributions',
                  '9% or 10.5%',
                  'Only for active contributors',
                ],
                [
                  'Owner or developer financing',
                  'Lots, new residenciales, foreign buyers',
                  'Set by the seller',
                  'Short terms, title often stays with the seller until paid',
                ],
              ],
            },
          },
          'Rates are from El Heraldo (Banhprovi, RAP and the Banco Central average, April to July 2026). Each lender sets its own conditions, so treat them as a starting point.',
        ],
      },
      {
        h: 'Bank mortgages: down payment, rates and terms',
        body: [
          'Honduran banks usually finance up to 90% of the home’s value, so plan for a down payment (prima) of at least 10%, plus closing costs. Banks prequalify you and check the credit bureau (central de riesgo) for late payments.',
          'Rates have come down. The Banco Central de Honduras reported that the average bank lending rate in lempiras fell from 15.90% in June 2025 to 12.33% in June 2026, and real-estate loans between L1 million and L5 million averaged 11.91%. In 2025 La Prensa still found private mortgage rates of 14% to 18%, so compare several banks before you choose.',
          'Ask whether the rate is fixed for the whole loan or only for the first years. Many bank mortgages fix the rate for one to five years and then adjust it.',
        ],
      },
      {
        h: 'Banhprovi and RAP: the cheaper public money',
        body: [
          '**Banhprovi** (Banco Hondureño para la Producción y la Vivienda) lends to buyers directly at its own branches and, more often, through banks, cooperatives and microfinance institutions. In July 2026 it offered loans of up to L1.2 million at 4% for social housing and up to L2.5 million at 7% for middle-class housing, both for up to 30 years. The intermediary bank still checks your credit, payment capacity and down payment.',
          'The catch is availability. In July 2026 Banhprovi said it had no fresh resources for lending through banks and was waiting on a US$400 million loan from CAF for housing, expected to reach banks around September or October 2026. Ask your bank or Banhprovi whether the funds are flowing before you sign a reservation.',
          '**RAP** (Régimen de Aportaciones Privadas) manages the housing fund that formally employed workers pay into. Affiliates can borrow to buy, build, buy land, improve a home or pay off a mortgage. In April 2026 the RAP cut its rates to 9% for incomes up to two minimum salaries and 10.5% above that, with up to L5 million and up to 30 years. You need at least 12 months of continuous contributions, and you apply through an authorized financial institution. Many listings advertised as "casas con RAP" are homes priced to fit these loans.',
        ],
      },
      {
        h: 'The bono de vivienda in 2026',
        body: [
          'The housing bonus was run for years by CONVIVIENDA under the previous national housing programme. In 2026 housing policy is led by the Secretaría de Vivienda y Asentamientos Humanos (Seviah).',
          'In June 2026 Seviah said families earning about half a minimum salary or less would get a bono covering 100% of construction, mainly families in extreme poverty who already own their land, and that social housing in 2026 could not cost more than L1.4 million. In July 2026 it proposed a one-off bono to lower the down payment, from L10,000 to L45,000 for a house and L20,000 to L82,500 for an apartment, for households earning one to four reference minimum salaries, plus a monthly subsidy for ten years.',
          'That plan was still being discussed with banks and builders in July 2026, so confirm with Seviah or your bank which subsidies are actually open. Seviah also says only certified projects and developers can offer government benefits, so check that a project advertising a bono is on its list.',
        ],
      },
      {
        h: 'Owner and developer financing',
        body: [
          'Many lotificaciones and new residenciales sell on instalments: a down payment, then monthly payments straight to the seller, often with no bank involved. It is quicker and needs less paperwork, which is why it is common for lots and for foreign buyers. Terms are usually shorter than a bank loan, and the rate is whatever the seller sets.',
          'The risk is that the seller often keeps the title until you finish paying. Use a written promise-of-sale contract reviewed by your own attorney, check that the land is titled and free of liens, and make sure the contract says when the deed is signed and registered. See [how to spot property scams](/blog/how-to-spot-property-scams-in-honduras) and [questions to ask a developer](/blog/buying-off-plan-in-honduras-questions-for-the-developer). You can browse [listings with owner financing](/listings?ownerFinancing=1) and [new developments](/developments) on Hogarli.',
        ],
      },
      {
        h: 'Can foreigners get a mortgage in Honduras?',
        body: [
          'Yes, but it is harder. The LatInvestor reports that foreign buyers in 2026 typically needed a down payment of at least 30%, and non-residents often 35% to 40%. Indicative rates were about 9% to 11% for dollar loans and 12% to 16% for lempira loans, often 0.5 to 2 points above what residents pay. Banks want residency or a strong local link, a local account, proof of income with translated tax returns and bank statements, and clear title.',
          'Banhprovi, RAP and the bono are designed for Honduran households, so foreigners should not count on them. In practice most Roatán purchases are paid in cash or through developer financing, and coastal and island property also goes through the Decreto 90-90 process. Budget for transfer tax and fees as well: see [Roatán closing costs](/guides/roatan-closing-costs).',
        ],
      },
      {
        h: 'Step by step, and the documents to prepare',
        body: [
          {
            list: [
              '**Work out your budget.** Keep the monthly payment to about 30% of household income, which is what lenders commonly use. You can combine income with a partner or parents.',
              '**Check your credit.** Clear any late payments in the central de riesgo before you apply.',
              '**Get prequalified.** Ask at least two banks, and ask each one whether it has Banhprovi or RAP funds available.',
              '**Gather documents.** Usually your ID (DNI or passport and residency card), proof of income such as a salary letter or tax returns, recent bank statements and, for RAP, your contribution record.',
              '**Choose the property.** Have your attorney check the title and liens. The bank will appraise the property and lend on that value.',
              '**Sign and register.** The deed and the mortgage are signed before a notary and registered at the Instituto de la Propiedad.',
            ],
            ordered: true,
          },
          'Ready to look? Start with [houses in Tegucigalpa](/listings?island=Tegucigalpa&type=house) and [houses in San Pedro Sula](/listings?island=San%20Pedro%20Sula&type=house), where most financed purchases happen.',
        ],
      },
      {
        h: 'Before you sign',
        body: [
          {
            note: 'Rates, loan limits and subsidies in Honduras change often, and the figures here are from April to July 2026. Confirm the current conditions with the bank, Banhprovi, the RAP or Seviah before you pay a reservation or sign a loan.',
          },
        ],
      },
    ],
    sources: [SOURCES.finBanhproviFunds, SOURCES.finBanhproviShortage, SOURCES.finBanhproviCaf, SOURCES.finRapVsBanhprovi, SOURCES.finRapRates, SOURCES.finSeviahPlan, SOURCES.finSeviahBono, SOURCES.finBankRates, SOURCES.finIncome, SOURCES.finLatMortgage],
    related: [
      'buying-off-plan-in-honduras-questions-for-the-developer',
      'how-to-spot-property-scams-in-honduras',
    ],
    guides: ['roatan-closing-costs', 'can-foreigners-buy-property-in-roatan'],
  },
  {
    slug: 'buying-land-in-honduras-lots-and-fincas',
    title: 'Land for sale in Honduras: how to buy a lot or a finca without surprises',
    description: 'Looking at land for sale in Honduras? How to check title, survey, road, water, power and subdivision approval before you buy a lot, a finca or beachfront land.',
    topic: 'buying',
    icon: 'land',
    published: '2026-10-18',
    updated: '2026-10-18',
    lead: 'Land is the cheapest way into Honduran property and the easiest place to make an expensive mistake. A lot can look perfect on the ground and still have no registered title, no legal road or no municipal approval. This article covers the main types of land for sale in Honduras and the checks to run on each one before you pay.',
    takeaways: [
      'Buy only land with a registered title in full ownership (dominio pleno) in the seller’s name, checked at the Instituto de la Propiedad.',
      'In a lotificación, confirm the municipality approved the subdivision and that water, power and roads are really coming.',
      'Buying al crédito from a developer is fine if the contract says exactly when and how you receive your deed.',
      'Foreigners face extra rules near the coast and borders: in those zones an individual can usually buy one urban lot of up to 3,000 m² for a home.',
    ],
    sections: [
      {
        h: 'The four kinds of land you will see',
        body: [
          'Search results for land in Honduras mix very different products. Knowing which one you are looking at tells you which risks to check first.',
          { table: {
            head: ['Type', 'Typical buyer', 'Main thing to check'],
            rows: [
              ['Urban lot in a lotificación', 'Families buying to build later, often al crédito', 'Municipal approval of the subdivision and real services'],
              ['Lot in a gated residencial', 'Buyers who want security and shared amenities', 'HOA rules, fees and who owns the streets and common areas'],
              ['Rural finca', 'Farming, ranching, weekend homes', 'Title type, boundaries, water source and road access'],
              ['Beachfront or island land', 'Holiday homes, rentals, foreign buyers', 'Coastal-zone rules, survey and environmental permits'],
            ],
          } },
          'Browse current offers by area: [all land](/listings?type=land), [oceanfront land](/listings?type=land&oceanfront=1), [Tegucigalpa](/listings?island=Tegucigalpa&type=land), [San Pedro Sula](/listings?island=San%20Pedro%20Sula&type=land) and [Roatán](/listings?island=Roat%C3%A1n&type=land).',
        ],
      },
      {
        h: 'Title: dominio pleno, dominio útil and ejidal land',
        body: [
          'The first question for any piece of land is what kind of right the seller actually holds. A report on land rights in Honduras by the [Norwegian Refugee Council](https://www.nrc.no/globalassets/pdf/reports/nowhere-is-safe/nowhere-is-safe---hlp-rights-for-persons-affected-by-displacement-in-honduras.pdf) explains the main categories:',
          { list: [
            '**Dominio pleno** is full private ownership. The owner can sell, rent, mortgage and leave the land to heirs. This is what you want to buy.',
            '**Dominio útil** is a right of use while ownership stays with the state or the municipality. It can be converted to dominio pleno if the legal conditions are met, but until then you are not buying full ownership.',
            '**Ejidal land** belongs to the municipality. Municipalities have issued titles over parts of it, so ask whether the lot has been converted to private land and by which act.',
          ] },
          'The same report notes that the Instituto de la Propiedad (IP), created in 2004, runs the national property registry and cadastre, and that the law does not recognise rights over real property that are not registered with it. Land sold with possession only (posesión) is a different, riskier product. The step-by-step registry check is in [how to check a land title](/guides/how-to-check-land-title-in-roatan); the method is the same on the mainland.',
        ],
      },
      {
        h: 'Survey, boundaries, road and services',
        body: [
          'A title describes the land on paper. You still need to prove that the paper and the ground match, and that the land is usable.',
          { list: [
            '**Survey (plano) and markers.** Have a surveyor walk the boundaries and compare the corner markers (mojones) with the registered plan and the IP cadastral record. Global Property Guide notes that the last step of a purchase is updating ownership at the cadastre.',
            '**Legal access.** A dirt track across a neighbour’s farm is not access. Check that the lot touches a public road or has a registered easement (servidumbre de paso).',
            '**Water.** Ask whether there is a municipal connection, a water board (junta de agua) or a well, and get it in writing.',
            '**Electricity.** Find out how far the nearest power line is and who pays to bring it to the lot.',
            '**Zoning and permits.** Ask the municipality what can be built and whether an environmental licence is needed, especially near rivers, slopes and the coast.',
          ] },
          'On Hogarli, every land listing has a [land passport](/land-passport) that shows title, road, electricity, water, survey, permits, zone and slope, and who checked each item and when.',
        ],
      },
      {
        h: 'Lotificaciones: the approval trap',
        body: [
          'Lotificaciones sell small urban lots, often on monthly payments, and they are the most common way Hondurans buy land. The trap is a subdivision the municipality never approved, or one that sells lots before installing the services it promised.',
          'In 2017 [El Heraldo](https://www.elheraldo.hn/pais/1094280-468/alcald%C3%ADa-de-choluteca-tras-urbanizaciones-ilegales) reported that of about 20 residential projects on the ring road of Choluteca, only 10 were legal and able to provide basic services; the other 10 had sold lots without delivering them, and buyers were left asking for water and electricity. Before you reserve a lot, ask the developer for:',
          { list: [
            'The municipal approval of the lotificación and its approved plan.',
            'The mother title (título madre) of the whole property in the developer’s name, free of liens.',
            'A written timetable for roads, water, drainage and power.',
            'Proof that each lot will get its own registered title once the subdivision is registered.',
          ] },
        ],
      },
      {
        h: 'Buying al crédito from a developer',
        body: [
          'Many lots are sold al crédito: a down payment and monthly instalments paid directly to the developer. This can work well, but until you receive a registered deed the land is still the developer’s, so the contract is your only protection. It should state:',
          { list: [
            'The exact lot number, area and boundaries, with the plan attached.',
            'The full price, the interest rate, the number of payments and what happens if you pay early.',
            'What happens if you miss payments, and how much you get back if the contract is cancelled.',
            'When the deed is signed before a notary and registered in your name, and who pays the notary and registration fees.',
            'What the developer must build, and by when.',
          ] },
          { note: 'A receipt book and a verbal promise are not a contract. Take the draft to your own attorney before paying the first instalment, and read [how to spot property scams](/blog/how-to-spot-property-scams-in-honduras).' },
        ],
      },
      {
        h: 'Foreigners, the coast and the borders',
        body: [
          'Article 107 of the Constitution restricts foreign ownership within 40 km of the coasts and borders and on the islands. [Decree 90-90](https://www.tsc.gob.hn/web/leyes/Ley%20para%20la%20Adquisicion%20de%20Bienes%20Urbanos%20en%20las%20Areas%20que...%20%28Decreto%2090-90%29%20%2808%29.pdf) makes an exception for urban property: according to Global Property Guide, a foreigner can buy one property of up to 3,000 m² for a private home, registered with the Ministry of Tourism, and must finish building within 36 months.',
          'That means beachfront land and large fincas inside the zone need extra care. [The LatInvestor](https://thelatinvestor.com/blogs/news/honduras-foreigner-rights) warns that agricultural land in these zones is off limits to foreigners unless it qualifies under Decree 90-90, and that a purchase on misclassified land can be declared void. Details are in [can foreigners buy property](/guides/can-foreigners-buy-property-in-roatan). Outside the restricted zones, foreigners can buy residential land.',
        ],
      },
      {
        h: 'Closing costs and the steps in order',
        body: [
          'Global Property Guide puts buyer costs at a 1.5% transfer tax, 3% to 5% for the notary and 0.15% for registration, and the whole process at about 22 days once the paperwork is ready. See [closing costs](/guides/roatan-closing-costs) for a breakdown.',
          { list: [
            'Shortlist land and ask for the title, plan and land passport.',
            'Hire your own attorney and order a registry and lien check at the IP.',
            'Have a surveyor confirm the boundaries and markers on site.',
            'Confirm road access, water, power, zoning and, for a lotificación, municipal approval.',
            'For foreigners, confirm whether the land is in the restricted zone and qualifies under Decree 90-90.',
            'Sign a written contract with payment and deed dates.',
            'Pay taxes, sign the deed before a notary, register it at the IP and update the cadastre.',
          ], ordered: true },
          { table: {
            head: ['Check', 'Document to ask for'],
            rows: [
              ['Ownership', 'Registered title in dominio pleno, seller’s name'],
              ['Liens', 'Certificate free of liens (libertad de gravamen)'],
              ['Boundaries', 'Survey plan matched to markers on site'],
              ['Access', 'Public road frontage or registered easement'],
              ['Services', 'Water and power availability in writing'],
              ['Subdivision', 'Municipal approval of the lotificación'],
              ['Taxes', 'Municipal tax clearance (solvencia)'],
              ['Foreign buyers', 'Zone status and Decree 90-90 eligibility'],
            ],
          } },
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.nrcHlp, SOURCES.heraldoLots, SOURCES.gpg, SOURCES.decree9090, SOURCES.latForeigners],
    related: ['how-to-spot-property-scams-in-honduras', 'buying-off-plan-in-honduras-questions-for-the-developer'],
    guides: ['how-to-check-land-title-in-roatan', 'can-foreigners-buy-property-in-roatan', 'roatan-closing-costs'],
  },
  {
    slug: 'cost-of-living-in-roatan',
    title: 'Cost of living in Roatán in 2026: rent, food, power and a monthly budget',
    description: 'The cost of living in Roatán in 2026: monthly budgets for singles, couples and families, rent by area, RECO electricity, groceries, healthcare and residency.',
    topic: 'living',
    icon: 'island',
    published: '2026-10-18',
    updated: '2026-10-18',
    lead: 'Most people living in Roatán spend somewhere between $1,500 and $3,500 a month, depending on where they rent, how much air conditioning they run and how often they eat out. This article puts the published numbers side by side, from rent in West Bay to pensionado residency, so you can build your own budget before moving to Roatán. Every figure is dated and sourced, and all of them vary.',
    takeaways: [
      'A retired couple can live comfortably on about $2,000 to $2,500 a month, according to International Living; a single person on a modest budget needs roughly $1,500 to $2,000.',
      'Rent is the biggest line: about $400 to $600 for a small place in French Harbour or Coxen Hole, and $800 to $1,000 for a one-bedroom in West End or West Bay.',
      'Electricity from RECO is expensive by North American standards, so air conditioning can decide your budget.',
      'To retire in Roatán, pensionado residency requires a pension of at least $1,500 a month; rentista residency requires $2,500 a month in stable income.',
    ],
    sections: [
      {
        h: 'What a month costs: single, couple, family',
        body: [
          'There is no official cost-of-living index for Roatán, so the best guide is a handful of expat publications that track it. Their numbers agree more than they differ. The table shows the ranges they give in 2026, in US dollars, which is how most rents on the island are quoted.',
          { table: {
            head: ['Household', 'Monthly budget', 'Source'],
            rows: [
              ['Single, modest', '$1,500 – $2,000', 'The LatInvestor (2026)'],
              ['Single, comfortable', '$2,500 – $3,500', 'The LatInvestor (2026)'],
              ['Retired couple', '$2,000 – $2,500', 'International Living (January 2026)'],
              ['Couple, sample budget', '$2,009 / $2,047', 'International Living / Live and Invest Overseas'],
              ['Family of four', 'Couple budget + larger home + school fees', 'See below'],
            ],
          } },
          'For a family, no source publishes a reliable total. Start from a couple’s budget and add the bigger home and school fees: Numbeo users report $1,250 to $2,000 a month for a three-bedroom apartment, and Expat Exchange puts private school tuition at roughly $300 to $600 a month per child, with international and bilingual schools costing more.',
          'Two sample budgets for a couple in a two-bedroom rental show where the money goes:',
          { table: {
            head: ['Item', 'International Living', 'Live and Invest Overseas'],
            rows: [
              ['Rent (two-bedroom)', '$1,000', '$1,200 (furnished)'],
              ['Electricity', '$120', '$102'],
              ['Gas and water', '$40', '$26'],
              ['Groceries and household', '$300', '$277'],
              ['Phone and internet', '$110', '$53'],
              ['Transport', '$50', '$82'],
              ['Dining out and entertainment', '$200', '$307'],
              ['Insurance, property tax, streaming', '$189', 'not listed'],
              ['Total', '$2,009', '$2,047'],
            ],
          } },
          { note: 'Figures are as published by each source in 2026, and some repeat older reporting. On an island that imports most of its goods, prices move with fuel and shipping costs, so treat every number here as a starting point and check current prices before you commit.' },
        ],
      },
      {
        h: 'Rent by area, and what owning costs',
        body: [
          'Rents fall from west to east, much like sale prices (see [best areas to live in Roatán](/guides/best-areas-to-live-in-roatan)). Expats quoted by Expat Exchange give these ranges for long-term leases:',
          { list: [
            '**[West Bay](/areas/west-bay) and [West End](/areas/west-end):** about $800 to $1,000 a month for a one-bedroom. A house in West Bay or Pristine Bay often costs $2,500 or more.',
            '**Sandy Bay:** about $1,000 to $1,500 a month for a house.',
            '**[French Harbour](/areas/french-harbour) and Coxen Hole:** about $400 to $600 a month for an apartment or small house.',
            '**East End:** no source publishes reliable rents. Long-term rentals are fewer and more spread out, so expect to search locally and to need a car.',
          ] },
          'International Living reports long-term leases from about $500 a month for a condo within walking distance of the beach, and $800 to $1,000 right on the water. Numbeo, based on only a handful of entries (last updated November 2025), shows about $850 for a central one-bedroom and $550 outside the centre. Browse current [long-term rentals on Roatán](/listings?island=Roat%C3%A1n&deal=rent) to see today’s asking rents.',
          '**If you buy,** budget for three recurring costs. Annual property tax is about 0.25% of the cadastral value, according to The LatInvestor; see the [market report](/market) for other figures. HOA fees in condominiums and gated communities vary widely with what they cover, such as security, a generator, water storage and pool upkeep, so ask for the current fee and last year’s accounts. Hurricane and windstorm insurance is worth pricing before you buy; see [hurricane season and property on the Bay Islands](/blog/hurricane-season-and-property-on-the-bay-islands). Compare [condos for sale on Roatán](/listings?island=Roat%C3%A1n&type=condo), and if you are not Honduran, read [can foreigners buy property in Roatán](/guides/can-foreigners-buy-property-in-roatan).',
        ],
      },
      {
        h: 'Electricity, water and internet',
        body: [
          'Power on Roatán does not come from the mainland grid. It is supplied by Roatán Electric Company (RECO), which generates it on the island from a propane plant, wind turbines, solar plants and battery storage, according to a 2024 report in Paya Magazine. The LatInvestor describes RECO’s rates as notably higher than what most North Americans or Europeans are used to paying, and power is the line that most often surprises newcomers.',
          { list: [
            '**Electricity:** the sample couple budgets allow $102 to $120 a month, but that assumes careful use. Running air conditioning day and night can multiply the bill. Before you rent, ask to see the last few RECO bills.',
            '**Water and gas:** budgeted at $26 to $40 a month together. Ask whether the home has a cistern and a pump, and who maintains them.',
            '**Internet:** Expat Exchange puts it at $50 to $100 a month; Numbeo lists about $100 for a connection of 60 Mbps or more. Test the speed at the property if you work online.',
          ] },
          'Expat Exchange puts basic utilities for an apartment, including electricity, water and garbage, at $100 to $200 a month in total.',
        ],
      },
      {
        h: 'Groceries, eating out and getting around',
        body: [
          'Most packaged food on Roatán is shipped in, so supermarket staples cost roughly what they do in the United States, International Living notes, while fresh fish and lobster are much cheaper. Numbeo users report about $1.41 for a litre of milk, $2 for a dozen eggs and $3 for a pound of chicken fillets (November 2025). A couple’s grocery budget runs about $277 to $300 a month in the samples above; local produce and fish bring it down, imported brands push it up.',
          'Eating out ranges widely. A plate at a local restaurant costs about $6 to $8, a local beer about $2 to $2.50, and dinner for two at a mid-range restaurant about $40, according to Numbeo and International Living.',
          { list: [
            '**Taxis and buses:** a short taxi ride costs about $2 to $3 and a bus about $1, according to Expat Exchange. Agree the taxi fare before you get in.',
            '**Water taxi:** International Living quotes $5 one way between West End and West Bay.',
            '**Car:** petrol was about $1.06 a litre in late 2025 (Numbeo). An expat quoted by Expat Exchange paid about $500 a month for a rental car. Outside walkable West End, most errands need a car or a taxi.',
          ] },
        ],
      },
      {
        h: 'Healthcare, insurance and residency for retirees',
        body: [
          'A doctor’s visit costs roughly $10 at a public clinic and up to $60 for a private GP or after-hours care, according to The LatInvestor. The International Living sample budget includes $100 a month for insurance, and an expat quoted by Expat Exchange paid about $50 a month for a basic health plan. Serious care may mean a trip to the mainland: one International Living reader paid about $5,000 for major surgery in Tegucigalpa, including a night in hospital and twelve days of accommodation.',
          'Retirees and people with passive income can apply for Honduran residency. The requirements published by the Secretaría de Gobernación, Justicia y Descentralización include:',
          { list: [
            '**Pensionado (retiree):** a permanent, stable pension from abroad of at least $1,500 a month, paid through a Honduran financial institution.',
            '**Rentista (fixed income):** permanent, stable income of at least $2,500 a month, certified by a Honduran bank and received through the Honduran financial system.',
            '**For both:** criminal record certificates from your home country and from Honduras, a Honduran medical certificate, apostilled and officially translated documents, and a $300 fee.',
          ] },
          'Live and Invest Overseas says the process can take six to nine months. Work with a Honduran immigration attorney, and rent while you wait; see [rent first, buy later](/blog/renting-in-honduras-before-you-buy).',
        ],
      },
      {
        h: 'Lempiras or dollars?',
        body: [
          'The local currency is the lempira (HNL). In August 2026 the rate was approaching 27 lempiras to the US dollar, according to the Banco Central de Honduras as reported by La Tribuna, with the lempira losing value more slowly than in recent years. On Roatán, rents, property and many tourist services are priced in dollars, while local shops, buses and markets price in lempiras. If your income is in dollars, a slowly weakening lempira makes local goods a little cheaper over time, but dollar rents and imported goods do not change.',
          'The surest way to learn your own cost of living is to live it for a few months. Rent first, keep every receipt and RECO bill, and you will know what Roatán costs for your household before you buy.',
        ],
      },
      { h: 'Important', body: [{ note: DISCLAIMER }] },
    ],
    sources: [SOURCES.numbeoRoatan, SOURCES.expatExchangeRoatan, SOURCES.intLivingRoatan, SOURCES.lioRoatan, SOURCES.latExpat, SOURCES.latTaxes, SOURCES.payaReco, SOURCES.sgjdPensionado, SOURCES.sgjdRentista, SOURCES.latribunaFx],
    related: ['renting-in-honduras-before-you-buy', 'hurricane-season-and-property-on-the-bay-islands'],
    guides: ['best-areas-to-live-in-roatan', 'can-foreigners-buy-property-in-roatan'],
  },
  {
    slug: 'best-places-near-duna-tower-roatan',
    title: 'West Bay and beyond: the best places near Duna Tower, Roatán',
    description: 'Beaches, snorkeling, restaurants and day trips within half an hour of Duna Tower in Crawfish Rock, from West Bay Beach and West End to Sandy Bay and French Harbour.',
    topic: 'living',
    icon: 'pin',
    published: '2026-10-16',
    updated: '2026-10-16',
    lead: 'Duna Tower sits in Crawfish Rock, on the north shore of central Roatán, inside Próspera. That puts the island’s famous west end, West Bay Beach, West End village and Sandy Bay, within a short drive, and French Harbour even closer. Here are the places worth knowing if you live or stay in the building, all real, all open to the public, and none of them paid to be listed.',
    takeaways: [
      'West Bay Beach is the island’s best white-sand beach, with a reef you can snorkel from the shore. Go early or on a day without cruise ships.',
      'West End is the place for sunsets, casual food and dive shops; Half Moon Bay has free snorkeling from the beach.',
      'Sandy Bay has the botanical gardens, the island museum and the dolphins at Anthony’s Key Resort.',
      'For everyday life, French Harbour is closest: supermarkets, seafood and the Black Pearl golf course at Pristine Bay.',
    ],
    sections: [
      {
        h: 'Where Duna Tower is, and how far everything is',
        body: [
          'Roatán is long and narrow, and one main road runs along it. Duna Tower is roughly in the middle, so the west-end beaches and the harbour towns are both an easy trip. The times below are approximate drives by car or taxi outside rush hour; on cruise ship days, the road to West Bay is slower.',
          { table: {
            head: ['Place', 'Best for', 'Roughly by car'],
            rows: [
              ['French Harbour', 'Groceries, seafood, golf', '15 minutes'],
              ['Airport (RTB)', 'Flights, Coxen Hole errands', '15 minutes'],
              ['Sandy Bay', 'Gardens, museum, dolphins', '20 minutes'],
              ['West End', 'Sunsets, food, diving', '30 minutes'],
              ['West Bay', 'The beach and the reef', '35 minutes'],
            ],
          } },
        ],
      },
      {
        h: 'West Bay: the beach and the reef',
        body: [
          '**West Bay Beach** is the reason most people come to Roatán: a long curve of raked white sand at the island’s western tip, with the reef only a few metres from shore. The stretch between Infinity Bay Resort and Grand Roatán Resort has no sea grass, which makes it the easiest place to walk in with a mask. Swim out about ten minutes and the reef wall drops some 25 metres (80 ft) into coral canyons with fish, rays and turtles.',
          { note: 'On cruise ship days West Bay can get very crowded. Check the port schedule, go early in the morning, or pick a day with no ships in.' },
          { list: [
            '**Gumbalimba Park.** A nature park just off the West Bay road with monkeys and tropical birds, a canopy zipline, a hanging bridge, a pirate-themed cave and its own beach. Good with children and visiting family.',
            '**Beach Club San Simon.** A private beach club with loungers and cabanas you can rent for half or a full day, and a grill known for lobster, grouper and rotisserie chicken.',
            '**Lala’s Gallery and Garden Cafe.** A garden café with a seasonal, vegetable-first menu, friendly to vegans and gluten-free diets, surrounded by Central American art.',
          ] },
          'A water taxi connects West Bay and West End in about ten minutes, so you can park once and do both in a day.',
        ],
      },
      {
        h: 'West End: sunsets, street food and diving',
        body: [
          'West End is a walkable village on a sandy road, with dive shops, small hotels and most of the island’s casual restaurants. It is where people who live on Roatán go on a Friday evening.',
          { list: [
            '**Half Moon Bay.** Free snorkeling straight from the beach: enter at the sheltered southern end and swim out to the reef, about 200 metres offshore, inside the Sandy Bay–West End marine reserve. Watch for boats.',
            '**Sundowners.** The classic sunset bar on Half Moon Bay, with a happy hour. Come for the view and the drinks rather than the food.',
            '**Creole’s Rotisserie Chicken.** Lightly spiced chicken with big sides; go for lunch or an early dinner before it sells out.',
            '**Calelu’s.** Cheap, filling baleadas, the Honduran folded tortilla, for breakfast, lunch or dinner.',
            '**Roatán Chocolate Factory.** A café with free tours of how the chocolate is made, and plenty to take home.',
            '**Roatán Institute of Deepsea Exploration.** Submarine trips to about 600 metres (2,000 ft) below the surface, by reservation only. A once-in-a-lifetime outing for visitors.',
          ] },
        ],
      },
      {
        h: 'Sandy Bay: gardens, history and dolphins',
        body: [
          { list: [
            '**Carambola Botanical Gardens.** A large orchid collection and forest trails up the hill, with a view over the West End coast from the top. Go in the morning, before the heat.',
            '**Roatán Museum.** A small museum of archaeological finds and island history at Anthony’s Key Resort.',
            '**Dolphin encounters.** Anthony’s Key Resort also runs dolphin encounters and swims you can book online, a favourite with children.',
          ] },
        ],
      },
      {
        h: 'Closer to home: French Harbour and the east',
        body: [
          'For everyday life you will mostly head east. French Harbour is the commercial hub of central Roatán, with the big supermarkets, hardware stores, marinas and banks. Read more in our [French Harbour area guide](/areas/french-harbour).',
          { list: [
            '**Gio’s.** A French Harbour institution for king crab in lemon butter, plus seafood and steaks.',
            '**Arch’s Iguana & Marine Park.** Thousands of iguanas, plus turtles, monkeys and a fish hatchery, on French Cay. The iguanas gather around noon for lunch.',
            '**Black Pearl golf course.** The island’s golf course at Pristine Bay Resort, designed by Perry Dye and opened in 2010.',
            '**The Crow’s Nest, Oak Ridge.** A garden restaurant with seafood, smoked pork and mango margaritas, on the way to the quieter east end.',
            '**Hole in the Wall, Jonesville.** A local favourite for lobster and shrimp that you reach by boat.',
          ] },
        ],
      },
      {
        h: 'A weekend from Duna Tower',
        body: [
          { list: [
            '**Saturday morning:** drive to West Bay before nine and snorkel the reef wall while the beach is quiet.',
            '**Saturday afternoon:** water taxi to West End, chicken at Creole’s, then sunset at Sundowners on Half Moon Bay.',
            '**Sunday morning:** the trails and orchids at Carambola Botanical Gardens in Sandy Bay.',
            '**Sunday evening:** king crab at Gio’s in French Harbour, fifteen minutes from home.',
          ], ordered: true },
          { note: 'Opening hours, prices and menus on the island change often, and some places close in the low season. Check before you go.' },
        ],
      },
      {
        h: 'Living here',
        body: [
          'Living in Crawfish Rock means a quieter, newer part of the island with West Bay, West End and French Harbour all within a short drive, at prices well below beachfront West Bay. See the apartments, floor plans and construction progress on the [Duna Tower page](/developments/duna-tower), or browse [long-term rentals](/listings?deal=rent) if you would like to try the area first. Comparing areas? Start with [the best areas to live in Roatán](/guides/best-areas-to-live-in-roatan) and the [West Bay area guide](/areas/west-bay).',
        ],
      },
    ],
    sources: [SOURCES.westBayBeach, SOURCES.snorkelWestEnd, SOURCES.fodorsSights, SOURCES.fodorsFood, SOURCES.westEndFood, SOURCES.blackPearl],
    related: ['renting-in-honduras-before-you-buy', 'buying-off-plan-in-honduras-questions-for-the-developer'],
    guides: ['best-areas-to-live-in-roatan'],
  },
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
