import type { Metadata } from 'next';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { TOP_N, WEIGHTS, loadRanking, periodLabel, rankingPeriod } from '@/lib/agentRanking';
import { makeT } from '@/lib/i18n';
import { getLang, getLp, getT } from '@/lib/i18n/server';
import { breadcrumbLd, graph } from '@/lib/seo';
import { localized } from '@/lib/seoMeta';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const month = periodLabel(rankingPeriod(), await getLang());
  return localized('/agents/top', {
    title: `${t('Top agents of the month: {month}', { month })} | ${SITE_NAME}`,
    description: t('The monthly ranking of real-estate agents on Hogarli in Honduras: listing quality, how fast they answer buyers and what buyers say about them.'),
  });
}

/** Публічний рейтинг «Агент місяця» і правила, за якими він рахується. */
export default async function TopAgentsPage() {
  const lp = await getLp();
  const lang = await getLang();
  const t = makeT(lang);
  const { period, rows } = await loadRanking().catch(() => ({ period: rankingPeriod(), rows: [] }));
  const month = periodLabel(period, lang);
  const top = rows.filter((r) => r.top);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Agents & agencies', path: '/agents' }, { name: 'Top agents', path: '/agents/top' }];

  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'ItemList',
        name: `Top agents on Hogarli, ${periodLabel(period, 'en')}`,
        url: `${SITE_URL}/agents/top`,
        itemListElement: top.map((r) => ({
          '@type': 'ListItem', position: r.rank,
          item: { '@type': 'RealEstateAgent', name: r.agent.name, url: `${SITE_URL}/agents/${r.agent.id}` },
        })),
      })} />

      <h1>{t('Top agents of the month: {month}', { month })}</h1>
      <p className="page__lead">
        {t('Every month Hogarli ranks the agents who make buying easier: complete listings, fast replies and happy buyers. The top {n} get the Top agent badge.', { n: TOP_N })}
      </p>

      {top.length > 0 && (
        <div className="top-agents">
          {top.map((r) => (
            <Link key={r.agent.id} className={`top-agent top-agent--${r.rank}`} href={lp(`/agents/${r.agent.id}`)}>
              <span className="top-agent__rank">#{r.rank}</span>
              <Avatar src={r.agent.avatar} name={r.agent.name} />
              <b className="with-ico">
                {r.agent.name}
                {r.agent.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
              </b>
              <span className="small muted">{r.agent.agency || t('Independent agent')}</span>
              <span className="top-agent__score">{t('{s} of 100 points', { s: r.score })}</span>
            </Link>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section__head"><h2>{t('Full ranking')}</h2></div>
        {rows.length === 0 ? (
          <div className="panel empty">
            <b>{t('No agents ranked yet.')}</b>
            <p className="muted small" style={{ marginTop: 6 }}>{t('Agents with at least one published listing join the ranking automatically.')}</p>
          </div>
        ) : (
          <div className="prose__table">
            <table className="table">
              <thead><tr>
                <th>#</th><th>{t('Agent')}</th><th>{t('Listings')}</th>
                <th>{t('Listing quality')}</th><th>{t('Replies within 24 h')}</th><th>{t('Reviews')}</th><th>{t('Points')}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.agent.id}>
                    <td>{r.rank}</td>
                    <td><Link className="link-accent" href={lp(`/agents/${r.agent.id}`)}>{r.agent.name}</Link>
                      <span className="tiny muted"> · {r.agent.agency || t('Independent agent')}</span></td>
                    <td>{r.listings}</td>
                    <td>{r.qualityPct}%</td>
                    <td>{r.response?.enough ? `${Math.round(r.response.answeredShare * 100)}%` : <span className="muted">{t('not enough enquiries')}</span>}</td>
                    <td>{r.agent.reviews > 0 ? `${r.agent.rating} ★ (${r.agent.reviews})` : <span className="muted">—</span>}</td>
                    <td><b>{r.score}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="prose prose--flush">
        <h2>{t('How the ranking works')}</h2>
        <ul>
          <li><b>{t('Listing quality, {n} points.', { n: WEIGHTS.quality })}</b> {t('The average completeness of the agent’s listings: photos, description, price, area, map pin and details. Full points from 5 listings.')}</li>
          <li><b>{t('Reply speed, {n} points.', { n: WEIGHTS.response })}</b> {t('The share of last month’s enquiries the agent answered within 24 hours. Counts from 3 enquiries in the month.')}</li>
          <li><b>{t('Buyer reviews, {n} points.', { n: WEIGHTS.reviews })}</b> {t('The average rating from buyers who contacted the agent. Full points from 5 reviews.')}</li>
          <li>{t('The ranking covers {month}. It cannot be bought: promoted listings do not change the points.', { month })}</li>
        </ul>
        <p className="small">
          {t('Are you an agent?')} <Link className="link-accent" href="/agent?tab=profile">{t('Get your badge and story image in your dashboard')}</Link>
          {' · '}<Link className="link-accent" href={lp('/for-agents')}>{t('Join Hogarli')}</Link>
        </p>
      </section>

      <div className="crumbs crumbs--foot small muted">
        <Link href={lp('/')}>{t('Home')}</Link> · <Link href={lp('/agents')}>{t('Agents & agencies')}</Link> · {t('Top agents')}
      </div>
    </div>
  );
}
