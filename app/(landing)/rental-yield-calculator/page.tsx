import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import RentalYieldCalculator from '@/components/RentalYieldCalculator';
import { localized } from '@/lib/seoMeta';
import { getLp, getT } from '@/lib/i18n/server';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { RENTAL_GUIDE } from '@/lib/rentalYield';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/rental-yield-calculator', {
    title: `${t('Roatán rental yield calculator')} | ${SITE_NAME}`,
    description: t('Work out the rental income and net yield of a Roatán or Honduras property: nightly rate, occupancy, management, HOA, insurance and taxes.'),
  });
}

/** Окрема сторінка калькулятора: ціну вписує людина; на сторінці оголошення він бере ціну й HOA з обʼєкта. */
export default async function RentalYieldPage() {
  const t = await getT();
  const lp = await getLp();
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Rental yield calculator', path: '/rental-yield-calculator' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'WebApplication',
        name: 'Roatán rental yield calculator',
        url: `${SITE_URL}/rental-yield-calculator`,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      })} />
      <h1>{t('Rental yield calculator')}</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        {t('Enter the price and your rental assumptions. The starting numbers are Roatán averages; change any of them to match the property you are looking at.')}
      </p>
      <RentalYieldCalculator price={300000} hoa={350} editablePrice />
      <p className="small" style={{ marginTop: 24 }}>
        <Link className="link-accent" href={lp(RENTAL_GUIDE)}>{t('Roatán rental income guide')}</Link>
        {' · '}
        <Link className="link-accent" href={lp('/listings?deal=sale&tags=Rental%20income')}>{t('Listings with rental income')}</Link>
      </p>
    </div>
  );
}
