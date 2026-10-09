import Link from 'next/link';
import { statusLabel, toM2 } from '@/lib/units';
import type { Listing } from '@/lib/types';
import { getLp } from '@/lib/i18n/server';

const short = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(v / 1_000)}K`);
const kind = (beds: number) => (beds ? `${beds}BR` : 'ST');

/**
 * «Шахматка»: поверхи згори донизу, у рядку — квартири поверху за номером.
 * Колір клітинки — стан квартири, клік веде на її оголошення.
 * Квартири без поверху сюди не потрапляють — вони є в таблиці вище.
 */
export default async function DevelopmentChess({ units }: { units: Listing[] }) {
  const lp = await getLp();
  const placed = units.filter((u) => u.floor !== null);
  if (!placed.length) return null;
  const floors = [...new Set(placed.map((u) => u.floor as number))].sort((a, b) => b - a);
  const byNo = (a: Listing, b: Listing) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true });

  return (
    <div className="chess">
      <div className="chess__legend tiny">
        {(['available', 'reserved', 'sold', 'rented'] as const)
          .filter((s) => placed.some((u) => u.status === s))
          .map((s) => <span key={s}><i className={`chess__dot chess__dot--${s}`} /> {statusLabel(s)}</span>)}
      </div>
      <div className="chess__grid">
        {floors.map((f) => (
          <div key={f} className="chess__floor">
            <span className="chess__label tiny muted">{f}</span>
            <div className="chess__units">
              {placed.filter((u) => u.floor === f).sort(byNo).map((u) => (
                <Link key={u.id} href={lp(`/listings/${u.id}`)} className={`chess__cell chess__cell--${u.status}`}
                  title={`Unit ${u.unitNo} · ${u.beds ? `${u.beds} BR` : 'Studio'}${u.sqft ? ` · ${toM2(u.sqft)} m² / ${u.sqft} ft²` : ''} · ${statusLabel(u.status)}`}>
                  <b>{u.unitNo || '—'}</b>
                  <span>{kind(u.beds)}</span>
                  <span>{u.status === 'available' || u.status === 'reserved'
                    ? (u.deal === 'rent' ? `$${u.price.toLocaleString('en-US')}/mo` : short(u.price))
                    : statusLabel(u.status)}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Floor on the left · ST studio, 1BR one bedroom · tap a unit to open it</p>
    </div>
  );
}
