import Link from 'next/link';
import Photo from './Photo';
import { fmtNumber, fmtUsd } from '@/lib/format';
import { OPEN_STATUSES, toM2 } from '@/lib/units';
import type { Building, Listing } from '@/lib/types';

const kind = (beds: number) => (beds ? `${beds}-bedroom` : 'Studio');

/**
 * «Планування», як у LUN: однакові квартири (тип + площа) — одна картка з планом,
 * ціною «від», кількістю вільних, поверхами й номерами. План береться з будь-якої квартири групи.
 */
export default function DevelopmentLayouts({ units, buildings }: { units: Listing[]; buildings: Building[] }) {
  const groups = new Map<string, Listing[]>();
  for (const u of units) {
    const key = `${u.beds}|${u.sqft ? Math.round(toM2(u.sqft) * 2) / 2 : 0}`;
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const byBeds = new Map<number, Listing[][]>();
  for (const g of [...groups.values()].sort((a, b) => a[0].sqft - b[0].sqft)) {
    byBeds.set(g[0].beds, [...(byBeds.get(g[0].beds) ?? []), g]);
  }
  const bname = (id: string | null) => buildings.find((b) => b.id === id)?.name;

  return (
    <div className="lay">
      {[...byBeds.entries()].sort(([a], [b]) => a - b).map(([beds, list]) => {
        const open = list.flat().filter((u) => OPEN_STATUSES.includes(u.status));
        const min = open.length ? Math.min(...open.filter((u) => u.deal === 'sale').map((u) => u.price)) : Infinity;
        return (
          <section key={beds} className="lay__group">
            <h2 className="lay__kind">{beds ? `${beds}-bedroom apartments` : 'Studios'}
              {Number.isFinite(min) && <span className="muted"> · from {fmtUsd(min)}</span>}</h2>
            <div className="lay__grid">
              {list.map((g) => {
                const free = g.filter((u) => OPEN_STATUSES.includes(u.status));
                const lead = [...(free.length ? free : g)].sort((a, b) => a.price - b.price)[0];
                const plan = g.find((u) => u.floorplan)?.floorplan;
                const floors = [...new Set(g.flatMap((u) => (u.floor !== null ? [u.floor] : [])))].sort((a, b) => a - b);
                const blds = [...new Set(g.map((u) => bname(u.buildingId)).filter(Boolean))];
                const byNo = [...g].sort((a, b) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true }));
                return (
                  <article key={lead.id} className="lay__card">
                    <Link href={`/listings/${lead.id}`} className={`lay__img${plan ? ' is-plan' : ''}`}>
                      <Photo src={plan || lead.photos[0] || ''} alt={`${kind(lead.beds)} layout, ${lead.sqft ? toM2(lead.sqft) : ''} m²`} label="Plan coming soon" />
                    </Link>
                    <div className="lay__body">
                      <b className="lay__title">{kind(lead.beds)}{lead.sqft > 0 && <> · {toM2(lead.sqft)} m² <span className="muted small">/ {fmtNumber(lead.sqft)} ft²</span></>}</b>
                      <div className="lay__price">
                        {free.length
                          ? lead.deal === 'rent' ? `${fmtUsd(lead.price)}/mo` : `from ${fmtUsd(lead.price)}`
                          : 'Sold out'}
                      </div>
                      <ul className="lay__facts small muted">
                        <li>{free.length} of {g.length} available</li>
                        {floors.length > 0 && <li>{floors.length > 1 ? 'Floors' : 'Floor'} {floors.join(', ')}</li>}
                        {blds.length > 0 && buildings.length > 1 && <li>{blds.join(', ')}</li>}
                      </ul>
                      <div className="lay__units">
                        {byNo.map((u) => (
                          <Link key={u.id} href={`/listings/${u.id}`}
                            className={`lay__unit${OPEN_STATUSES.includes(u.status) ? '' : ' is-off'}`}>{u.unitNo || '—'}</Link>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
