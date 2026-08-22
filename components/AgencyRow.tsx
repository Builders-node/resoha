import Link from 'next/link';
import { fmtNumber } from '@/lib/format';
import type { Agency } from '@/lib/types';

type Row = { agency: Agency; listings: number; agents: number };

/** Плитки агенцій у стилі блоку «Агенції нерухомості» на ЛУН. */
export default function AgencyRow({ rows }: { rows: Row[] }) {
  return (
    <div className="agc-row">
      {rows.map(({ agency, listings, agents }) => {
        const words = agency.name.split(' ');
        const tail = words.length > 1 ? words[words.length - 1] : 'Roatán';
        const head = words.length > 1 ? words.slice(0, -1).join(' ') : agency.name;
        const initials = words.map((w) => w[0]).join('').slice(0, 2).toUpperCase();

        return (
          <Link key={agency.id} className="agc" href={`/agency/${agency.id}`} style={{ background: agency.brand }}>
            <div className="agc__name">{agency.name}</div>

            <div className="agc__logo">
              <div>
                <div className="agc__mono">{initials}</div>
                <div className="agc__word">{head}</div>
                <div className="agc__sub">{tail}</div>
              </div>
            </div>

            <div className="agc__stats">
              <div>
                <b>{fmtNumber(listings)}</b>
                <span>{listings === 1 ? 'listing' : 'listings'}</span>
              </div>
              <div>
                <b>{fmtNumber(agents)}</b>
                <span>{agents === 1 ? 'agent' : 'agents'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
