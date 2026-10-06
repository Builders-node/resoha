import type { Metadata } from 'next';
import Link from 'next/link';
import Photo from '@/components/Photo';
import { listDevelopments, queryListings } from '@/lib/db';
import { fmtUsd } from '@/lib/format';
import { SITE_NAME } from '@/lib/site';
import { fromPrice, salesLabel } from '@/lib/units';

export const metadata: Metadata = {
  title: `New developments in Roatán | ${SITE_NAME}`,
  description: 'Condo towers and new-build projects on Roatán with unit-by-unit prices from the developer.',
  alternates: { canonical: '/developments' },
};

export default async function DevelopmentsPage() {
  const devs = await listDevelopments();
  // ціна «від» і кількість квартир — по одній вибірці на ЖК; їх небагато
  const units = await Promise.all(devs.map((d) => queryListings({ developmentId: d.id })));

  return (
    <div className="wrap" style={{ padding: '30px 32px 60px' }}>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>New developments</h1>
      <p className="muted" style={{ marginBottom: 22 }}>Buildings on Roatán with every unit and price in one place.</p>
      {!devs.length && <p className="muted">No developments listed yet.</p>}
      <div className="dev-grid">
        {devs.map((d, i) => {
          const list = units[i];
          const from = fromPrice(list.filter((u) => u.deal === 'sale'));
          return (
            <Link key={d.id} href={`/developments/${d.slug}`} className="ov ov--wide">
              <Photo src={d.photos[0]} alt={d.name} />
              <div className="card__badges"><span className="badge badge--brand">{salesLabel(d.sales)}</span></div>
              <div className="ov__b">
                {d.developer && <div className="ov__agency">{d.developer}</div>}
                <div className="ov__title">{d.name}</div>
                <div className="ov__meta">{d.neighborhood} · {list.length} units{d.completion && ` · ${d.completion}`}</div>
                {from !== null && <div className="ov__price">From {fmtUsd(from)}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
