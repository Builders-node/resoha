'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { fmtNumber } from '@/lib/format';
import { WEEKDAYS, fmtHours, hourLabel } from '@/lib/analytics';
import type { AdminAnalytics as Data } from '@/lib/adminAnalytics';
import { BarList, C, DayBars, Funnel, Heatmap, Kpi, ListingTable, TrendChart } from './AnalyticsPanel';

/**
 * Вкладка «Analytics» в адмінці: уся платформа. Графіки ті самі, що в кабінеті агенції
 * (AnalyticsPanel), дані — /api/admin/analytics.
 */

const AQUA = '#1baf7a';

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loaded, setLoaded] = useState(0);
  const loading = loaded !== days;

  useEffect(() => {
    let off = false;
    fetch(`/api/admin/analytics?days=${days}`).then((r) => r.json()).then((d) => {
      if (!off) { setData(d.totals ? d : null); setLoaded(days); }
    }).catch(() => { if (!off) setLoaded(days); });
    return () => { off = true; };
  }, [days]);

  const agentName = useMemo(() => {
    const m = new Map((data?.agents ?? []).map((a) => [a.id, a.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [data]);

  const filters = (
    <div className="chip-row">
      {[7, 30, 90].map((d) => (
        <button key={d} className={`chip-btn ${days === d ? 'is-on' : ''}`} onClick={() => setDays(d)}>{d} days</button>
      ))}
    </div>
  );

  if (!data) {
    return (
      <div className="panel an">
        <div className="an-filters">{filters}</div>
        <div className="empty">{loading ? 'Crunching platform numbers…' : 'Could not load analytics. Try again in a minute.'}</div>
      </div>
    );
  }

  const { totals, prev, series, growth, people, supply, demand, leadHealth } = data;
  const spark = (k: 'views' | 'visitors' | 'contacts' | 'leads') => series.map((d) => d[k]);
  const devTotal = data.devices.mobile + data.devices.desktop;
  const mobilePct = devTotal ? Math.round((data.devices.mobile / devTotal) * 100) : 0;
  const zeroPct = demand.searches ? Math.round((demand.zeroResults / demand.searches) * 100) : 0;
  const maxRatio = Math.max(1, ...demand.areas.map((a) => Math.max(a.searches, a.supply)));

  return (
    <div className={`an ${loading ? 'is-loading' : ''}`}>
      <div className="an-top">
        <div>
          <h3>Platform analytics</h3>
          <p className="muted small">All agencies and agents · last {data.days} days, compared with the {data.days} days before</p>
        </div>
        <div className="an-filters">{filters}</div>
      </div>

      {data.insights.length > 0 && (
        <div className="panel an-insights">
          <h4><Icon name="sparkle" size={18} /> Worth a look</h4>
          <ul>
            {data.insights.map((i) => (
              <li key={i.text} className={`an-ins an-ins--${i.tone}`}>
                <span className="an-ins__ico">{i.tone === 'good' ? '▲' : i.tone === 'warn' ? '!' : 'i'}</span>
                {i.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="an-section">Traffic & leads</h4>
      <div className="an-kpis">
        <Kpi label="Unique visitors" value={fmtNumber(totals.visitors)} cur={totals.visitors} prev={prev.visitors} spark={spark('visitors')} color={C.visitors} />
        <Kpi label="Page views" value={fmtNumber(totals.views)} cur={totals.views} prev={prev.views} spark={spark('views')} color={C.views}
          hint="Listing pages plus development pages" />
        <Kpi label="Opened contacts" value={fmtNumber(totals.contacts)} cur={totals.contacts} prev={prev.contacts} spark={spark('contacts')} color={C.leads} />
        <Kpi label="Leads" value={fmtNumber(totals.leads)} cur={totals.leads} prev={prev.leads} spark={spark('leads')} color={C.leads} />
        <Kpi label="Conversion" value={`${totals.conversion}%`} cur={totals.conversion} prev={prev.conversion} suffix="pp" hint="Leads ÷ unique visitors" />
        <Kpi label="Median reply" value={data.responseHours === null ? '—' : fmtHours(data.responseHours)} cur={0} prev={0}
          hint="Median time from a lead arriving to the agent marking it handled" />
      </div>

      <h4 className="an-section">Growth & demand</h4>
      <div className="an-kpis">
        <Kpi label="New accounts" value={fmtNumber(people.newUsers)} cur={people.newUsers} prev={people.newUsersPrev}
          spark={growth.map((g) => g.signups)} color={C.visitors} hint={`${fmtNumber(people.total)} accounts in total`} />
        <Kpi label="New agents" value={fmtNumber(people.newAgents)} cur={people.newAgents} prev={people.newAgentsPrev}
          spark={growth.map((g) => g.agents)} color={C.visitors} hint={`${people.agents} agents, ${people.verifiedAgents} verified`} />
        <Kpi label="New listings" value={fmtNumber(supply.newListings)} cur={supply.newListings} prev={supply.newListingsPrev}
          spark={growth.map((g) => g.listings)} color={C.views} hint={`${supply.active} live of ${supply.listings}`} />
        <Kpi label="Searches" value={fmtNumber(demand.searches)} cur={demand.searches} prev={demand.searchesPrev}
          spark={growth.map((g) => g.searches)} color={AQUA} hint={`${fmtNumber(demand.visitors)} people searched`} />
        <Kpi label="Found nothing" value={`${zeroPct}%`} cur={0} prev={0} hint={`${demand.zeroResults} searches with zero results`} />
        <Kpi label="Leads waiting" value={fmtNumber(leadHealth.open)} cur={0} prev={0}
          hint={`${leadHealth.overdue} waiting over 24 hours`} />
      </div>

      <div className="panel">
        <div className="an-head">
          <h4>Traffic</h4>
          <div className="an-legend tiny">
            <span><i style={{ background: C.views }} />Views</span>
            <span><i style={{ background: C.visitors }} />Unique visitors</span>
          </div>
        </div>
        <TrendChart series={series} />
        <div className="an-head" style={{ marginTop: 20 }}><h4 className="small">Leads per day</h4></div>
        <DayBars points={series.map((s) => ({ date: s.date, value: s.leads }))} color={C.leads} label="Leads"
          tip={(i) => <span>Contacts opened <b>{series[i].contacts}</b></span>} />
      </div>

      <div className="an-grid3">
        <div className="panel">
          <h4 className="small">New accounts</h4>
          <DayBars points={growth.map((g) => ({ date: g.date, value: g.signups }))} color={C.visitors} label="Accounts"
            tip={(i) => <span>of them agents <b>{growth[i].agents}</b></span>} />
        </div>
        <div className="panel">
          <h4 className="small">New listings</h4>
          <DayBars points={growth.map((g) => ({ date: g.date, value: g.listings }))} color={C.views} label="Listings" />
        </div>
        <div className="panel">
          <h4 className="small">Searches</h4>
          <DayBars points={growth.map((g) => ({ date: g.date, value: g.searches }))} color={AQUA} label="Searches" />
        </div>
      </div>

      <div className="an-grid2">
        <div className="panel">
          <h4>Funnel</h4>
          <p className="muted tiny an-cap">Every listing and development on the platform</p>
          <Funnel steps={data.funnel} />
        </div>
        <div className="panel">
          <h4>How buyers reach agents</h4>
          <p className="muted tiny an-cap">Contact actions and leads by channel</p>
          <BarList items={data.channels} color={C.leads} empty="No contacts yet in this period." />
          <div className="an-health">
            <span><b>{leadHealth.total ? Math.round((leadHealth.within24h / leadHealth.total) * 100) : 0}%</b><span className="tiny muted">of leads answered within 24 h</span></span>
            <span><b>{data.handledShare}%</b><span className="tiny muted">marked handled</span></span>
            <span><b className={leadHealth.overdue ? 'an-bad' : ''}>{leadHealth.overdue}</b><span className="tiny muted">waiting 24 h+</span></span>
          </div>
        </div>
      </div>

      <div className="an-grid2">
        <div className="panel">
          <h4>Where visitors come from</h4>
          <p className="muted tiny an-cap">Links tagged with <code>?utm_source=…</code> are counted by their tag</p>
          <BarList items={data.sources} color={C.views} empty="No tracked visits yet." />
          {devTotal > 0 && (
            <div className="an-device">
              <div className="an-device__bar">
                <span style={{ width: `${mobilePct}%`, background: C.views }} />
                <span style={{ width: `${100 - mobilePct}%`, background: C.visitors }} />
              </div>
              <div className="an-legend tiny">
                <span><i style={{ background: C.views }} />Phone {mobilePct}%</span>
                <span><i style={{ background: C.visitors }} />Computer {100 - mobilePct}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="panel">
          <h4>When buyers look</h4>
          <p className="muted tiny an-cap">
            {data.peak ? `Peak: ${WEEKDAYS[data.peak.day]}s around ${hourLabel(data.peak.hour)}` : 'Views by weekday and hour'}
          </p>
          <Heatmap grid={data.heatmap} />
        </div>
      </div>

      <div className="panel">
        <h4>Demand vs supply by area</h4>
        <p className="muted tiny an-cap">How often buyers filtered by an area, against live listings there. A high ratio means buyers want more than is listed.</p>
        {demand.areas.length ? (
          <div className="an-demand">
            <div className="an-legend tiny">
              <span><i style={{ background: AQUA }} />Searches</span>
              <span><i style={{ background: C.views }} />Live listings</span>
            </div>
            {demand.areas.map((a) => (
              <div key={a.key} className="an-demand__row">
                <div className="an-demand__head">
                  <span>{a.label}</span>
                  <span className="tiny">
                    <b>{a.searches}</b> searches · <b>{a.supply}</b> listed
                    {a.ratio !== null
                      ? <span className={a.ratio >= 3 ? 'an-bad' : 'muted'}> · {a.ratio}× demand</span>
                      : <span className="an-bad"> · nothing listed</span>}
                  </span>
                </div>
                <div className="an-demand__bars">
                  <span style={{ width: `${(a.searches / maxRatio) * 100}%`, background: AQUA }} />
                  <span style={{ width: `${(a.supply / maxRatio) * 100}%`, background: C.views }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted small">No area searches yet. They appear as buyers use the area filter.</p>}
      </div>

      <div className="an-grid4">
        <div className="panel">
          <h4 className="small">Buy or rent</h4>
          <BarList items={demand.deals} color={AQUA} empty="No searches yet." />
        </div>
        <div className="panel">
          <h4 className="small">Property type</h4>
          <BarList items={demand.types} color={AQUA} empty="No searches yet." />
        </div>
        <div className="panel">
          <h4 className="small">Budget (buying)</h4>
          <BarList items={demand.prices} color={AQUA} empty="No searches yet." />
        </div>
        <div className="panel">
          <h4 className="small">Bedrooms</h4>
          <BarList items={demand.beds} color={AQUA} empty="Nobody filtered by bedrooms yet." />
        </div>
      </div>

      <div className="an-grid2">
        <div className="panel">
          <h4>What people type</h4>
          <p className="muted tiny an-cap">Free-text searches</p>
          {demand.queries.length ? (
            <ol className="an-queries">
              {demand.queries.map((q) => (
                <li key={q.q}>
                  <span>“{q.q}”</span>
                  <span className="tiny"><b>{q.count}</b>{q.zero > 0 && <span className="an-bad"> · {q.zero} found nothing</span>}</span>
                </li>
              ))}
            </ol>
          ) : <p className="muted small">No text searches yet.</p>}
        </div>
        <div className="panel">
          <h4>Searches with no results</h4>
          <p className="muted tiny an-cap">Missing stock: what buyers wanted and did not find</p>
          {demand.zeroCombos.length ? (
            <ol className="an-queries">
              {demand.zeroCombos.map((z) => (
                <li key={z.label}><span>{z.label}</span><span className="tiny"><b>{z.count}</b></span></li>
              ))}
            </ol>
          ) : <p className="muted small">Every search found something.</p>}
        </div>
      </div>

      <div className="panel">
        <h4>Agencies</h4>
        <p className="muted tiny an-cap">Ranked by leads, then views. Independent agents are grouped in one row.</p>
        <div className="an-scroll">
          <table className="table an-table">
            <thead>
              <tr><th>Agency</th><th>Agents</th><th>Listings</th><th>Views</th><th>Contacts</th><th>Leads</th><th>Conv.</th><th>Reply time</th><th>Handled</th><th>Waiting</th></tr>
            </thead>
            <tbody>
              {data.agencies.map((a) => {
                const top = Math.max(1, data.agencies[0]?.leads ?? 1);
                return (
                  <tr key={a.id || 'independent'}>
                    <td>
                      {a.id ? <Link href={`/agency/${a.id}`}><b>{a.name}</b></Link> : <b>{a.name}</b>}
                      {a.verified && <Icon name="verified" size={15} className="ico ico--ok" style={{ marginLeft: 4, verticalAlign: '-2px' }} />}
                    </td>
                    <td data-label="Agents">{a.agents}</td>
                    <td data-label="Listings">{a.active}<span className="muted tiny"> / {a.listings}</span></td>
                    <td data-label="Views">{fmtNumber(a.views)}</td>
                    <td data-label="Contacts">{fmtNumber(a.contacts)}</td>
                    <td data-label="Leads">
                      <div className="an-inline">
                        <b>{a.leads}</b>
                        <span className="an-inline__bar"><span style={{ width: `${(a.leads / top) * 100}%`, background: C.leads }} /></span>
                      </div>
                    </td>
                    <td data-label="Conv.">{a.conversion}%</td>
                    <td data-label="Reply time">{a.responseHours === null ? '—' : fmtHours(a.responseHours)}</td>
                    <td data-label="Handled">{a.leads ? `${a.handledShare}%` : '—'}</td>
                    <td data-label="Waiting">{a.openLeads ? <span className="an-bad">{a.openLeads}</span> : 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h4>Top agents</h4>
        <p className="muted tiny an-cap">Ranked by leads, then views</p>
        <div className="an-scroll">
          <table className="table an-table">
            <thead>
              <tr><th>#</th><th>Agent</th><th>Listings</th><th>Views</th><th>Contacts</th><th>Leads</th><th>Conv.</th><th>Reply time</th><th>Handled</th></tr>
            </thead>
            <tbody>
              {data.agents.filter((a) => a.listings > 0 || a.leads > 0).slice(0, 15).map((a, i) => (
                <tr key={a.id}>
                  <td className="an-td-rank">{i + 1}</td>
                  <td><Link href={`/agents/${a.id}`}><b>{a.name}</b></Link></td>
                  <td data-label="Listings">{a.active}<span className="muted tiny"> / {a.listings}</span></td>
                  <td data-label="Views">{fmtNumber(a.views)}</td>
                  <td data-label="Contacts">{fmtNumber(a.contacts)}</td>
                  <td data-label="Leads"><b>{a.leads}</b></td>
                  <td data-label="Conv.">{a.conversion}%</td>
                  <td data-label="Reply time">{a.responseHours === null ? '—' : fmtHours(a.responseHours)}</td>
                  <td data-label="Handled">{a.leads ? `${a.handledShare}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h4>Listings</h4>
        <p className="muted tiny an-cap">Every listing on the platform. Click a column to sort; tick the box to see the ones that need attention.</p>
        <ListingTable rows={data.listings} agentName={agentName} />
      </div>

      {data.developments.length > 0 && (
        <div className="panel">
          <h4>Developments</h4>
          <p className="muted tiny an-cap">Page views of the development plus views of its units</p>
          <div className="an-devs">
            {data.developments.map((d) => {
              const soldPct = d.units ? Math.round((d.sold / d.units) * 100) : 0;
              return (
                <Link key={d.id} href={`/developments/${d.slug}`} className="an-dev">
                  <b>{d.name}</b>
                  <div className="an-dev__nums">
                    <span><b>{fmtNumber(d.pageViews + d.unitViews)}</b><span className="tiny muted">views</span></span>
                    <span><b>{fmtNumber(d.contacts)}</b><span className="tiny muted">contacts</span></span>
                    <span><b>{d.leads}</b><span className="tiny muted">leads</span></span>
                  </div>
                  {d.units > 0 && (
                    <>
                      <div className="an-dev__bar"><span style={{ width: `${soldPct}%` }} /></div>
                      <span className="tiny muted">{d.sold} of {d.units} units sold or rented · {d.available} available</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <h4>Live stock by type</h4>
        <BarList items={supply.byType} color={C.views} empty="No live listings." />
      </div>
    </div>
  );
}
