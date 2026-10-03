import { SOURCES, type Source } from './sources';

/** Коли востаннє звіряли цифри нижче з джерелами. Міняти разом із цифрами. */
export const MARKET_UPDATED = '2026-10-03';

export type Fact = { label: string; value: string; note?: string; source: Source };

/** Ключові цифри ринку Роатану — одна таблиця на звіт, головну й llms.txt. */
export const MARKET_FACTS: Fact[] = [
  { label: 'Homes for sale on Roatán', value: '≈ 340', note: 'May 2026', source: SOURCES.buyingRoatan },
  { label: 'Home sales closed in a month', value: '9', note: 'May 2026', source: SOURCES.buyingRoatan },
  { label: 'Typical time to sell', value: '≈ 10 months', source: SOURCES.buyingRoatan },
  { label: 'Median asking price / median sold price', value: '≈ $475K / ≈ $354K', source: SOURCES.buyingRoatan },
  { label: 'Annual price growth', value: '≈ +6% in USD', source: SOURCES.latMarket },
  { label: 'Typical discount from asking price', value: '5–9%', source: SOURCES.latMarket },
  { label: 'Buyer closing costs', value: '3–7% (most deals 4–5.5%)', source: SOURCES.latTaxes },
  { label: 'Property transfer tax', value: '1.5% of the price', source: SOURCES.latTaxes },
  { label: 'Annual property tax', value: '0.25% of cadastral value', source: SOURCES.latTaxes },
  { label: 'Agent commission', value: '≈ 10%, paid by the seller', source: SOURCES.figueroa },
  { label: 'Active short-term rentals', value: '1,002', note: 'down 48.7% year on year', source: SOURCES.airdna },
  { label: 'Short-term rental occupancy / average nightly rate', value: '43% / $209', source: SOURCES.airdna },
  { label: 'Cruise passengers', value: '1.7 million', note: '2024', source: SOURCES.cruise },
];

export const DIRECT_FLIGHTS = ['Miami', 'Houston', 'Atlanta', 'Dallas', 'Denver', 'Minneapolis', 'Toronto', 'Montreal'];
