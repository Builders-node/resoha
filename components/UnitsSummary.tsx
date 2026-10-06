import { fmtNumber, fmtUsd } from '@/lib/format';
import { groupUnits, salesLabel, statusLabel, type ProjectInfo, type Unit } from '@/lib/units';

const span = (r: [number, number] | null, fmt: (n: number) => string, unit = '') =>
  !r ? '—' : r[0] === r[1] ? `${fmt(r[0])}${unit}` : `${fmt(r[0])} – ${fmt(r[1])}${unit}`;
const m2 = (n: number) => String(Math.round(n * 10) / 10);
/** $107K, $1.2M — у рядках зведення, як «від 2.4 млн» у забудовників */
const short = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(v / 1_000)}K`);

/**
 * Блок «Sales from the developer» для новобудов: шапка з забудовником і запитом,
 * термін здачі, рядок на тип квартир із діапазонами, а по кліку — сам список юнітів.
 * Без клієнтського JS: розкриття тримає <details>.
 */
export default function UnitsSummary({ units, project, contactHref }: {
  units: Unit[];
  project: ProjectInfo;
  contactHref: string;
}) {
  const groups = groupUnits(units);
  const perM2 = groups.flatMap((g) => (g.perM2 ? [g.perM2[0]] : []));
  const floors = units.flatMap((u) => (u.floor !== null ? [u.floor] : []));
  const available = units.filter((u) => u.status === 'available').length;

  return (
    <section className="dev" id="units">
      <h2 className="dev__title">Units &amp; prices</h2>

      <div className="dev__box">
        <div className="dev__head">
          <span className="muted">
            {project.developer ? <>Project by <b className="dev__by">{project.developer}</b></> : 'New development'}
          </span>
          <a className="btn dev__ask" href={contactHref}>Ask about prices &amp; availability</a>
        </div>

        <div className="dev__body">
          <div className="dev__top">
            {project.completion && (
              <div className="dev__field"><span className="tiny muted">Completion</span><b>{project.completion}</b></div>
            )}
            {perM2.length > 0 && <b className="dev__ppm">from {fmtUsd(Math.min(...perM2))}/m²</b>}
            <span className={`dev__status dev__status--${project.sales}`}>
              <i aria-hidden /> {salesLabel(project.sales)}
            </span>
          </div>

          {groups.map((g) => (
            <details key={g.beds} className="dev__row">
              <summary>
                <b className="dev__type">{g.label}</b>
                <span className="dev__size">
                  {span(g.m2, m2, ' m²')}
                  {g.sqft && <span className="tiny muted">{span(g.sqft, fmtNumber, ' ft²')}</span>}
                </span>
                <span className="dev__per">{span(g.perM2, fmtNumber, ' $/m²')}</span>
                <b className="dev__from">from {short(g.from)}</b>
                <span className="dev__count tiny muted">{g.available} of {g.units.length} open</span>
                <svg className="dev__chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="units__wrap">
                <table className="units__table">
                  <thead>
                    <tr><th>Unit</th><th>Floor</th><th>Size</th><th className="units__ppm">$/m²</th><th className="units__num">Price</th></tr>
                  </thead>
                  <tbody>
                    {g.units.map((u) => (
                      <tr key={u.unit} className={u.status === 'sold' ? 'is-sold' : undefined}>
                        <td><b>{u.unit}</b></td>
                        <td>{u.floor ?? '—'}</td>
                        <td>
                          {u.m2 !== null && <>{u.m2} m²</>}
                          {u.sqft !== null && <span className="muted"> · {fmtNumber(u.sqft)} ft²</span>}
                        </td>
                        <td className="units__ppm">{u.m2 ? fmtNumber(Math.round(u.price / u.m2)) : '—'}</td>
                        <td className="units__num">
                          {u.status === 'available' ? <b>{fmtUsd(u.price)}</b> : <span className="muted">{statusLabel(u.status)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>

      <ul className="dev__facts">
        <li>{available} of {units.length} units available</li>
        {floors.length > 0 && <li>Floors {Math.min(...floors)}–{Math.max(...floors)}</li>}
        {project.website && (
          <li><a href={project.website} target="_blank" rel="noopener noreferrer nofollow">{project.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></li>
        )}
      </ul>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        Prices from the developer&apos;s price list — ask the agent which units are still open.
      </p>
    </section>
  );
}
