import type { Metadata } from 'next';
import DevelopmentsExplorer, { type DevItem } from '@/components/DevelopmentsExplorer';
import { listDevelopments, queryListings } from '@/lib/db';
import { fmtUsd } from '@/lib/format';
import { SITE_NAME } from '@/lib/site';
import { trackPromo } from '@/lib/promo';
import { fromPrice, salesLabel } from '@/lib/units';

export const metadata: Metadata = {
  title: `New developments in Roatán | ${SITE_NAME}`,
  description: 'Condo towers and new-build projects on Roatán with unit-by-unit prices from the developer.',
  alternates: { canonical: '/developments' },
};

export default async function DevelopmentsPage() {
  const devs = await listDevelopments(); // відмічені адміном — першими (див. listDevelopments)
  // ціна «від» і кількість квартир — по одній вибірці на ЖК; їх небагато
  const units = await Promise.all(devs.map((d) => queryListings({ developmentId: d.id })));
  await trackPromo('development', devs, 'impression');

  const items: DevItem[] = devs.map((d, i) => {
    const from = fromPrice(units[i].filter((u) => u.deal === 'sale'));
    return {
      id: d.id, slug: d.slug, name: d.name, developer: d.developer, neighborhood: d.neighborhood,
      completion: d.completion, photo: d.photos[0], featured: d.featured, sales: salesLabel(d.sales), salesKey: d.sales,
      units: units[i].length, from: from === null ? null : fmtUsd(from), fromValue: from, lat: d.lat, lng: d.lng,
    };
  });

  return <DevelopmentsExplorer items={items} />;
}
