import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { breadcrumbLd, graph, ORG_DESCRIPTION } from '@/lib/seo';
import { CONTACT_EMAIL, OPERATOR, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `About Resoha: every property on Roatán in one checked place | ${SITE_NAME}`,
  description: ORG_DESCRIPTION,
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  { icon: 'link', title: 'Every listing says where it came from', text: 'Each property links back to the island agency or agent who holds it. No scraped duplicates, no stock photos, no listings that sold last year.' },
  { icon: 'deed', title: 'Land facts, not adjectives', text: 'Land listings carry a land passport: title, road, power, water, survey, permit, zone and slope, marked confirmed or not, with a date.' },
  { icon: 'chat', title: 'Talk to the agent directly', text: 'Enquiries go straight to the listing agent by WhatsApp, phone or email. Resoha is not a broker and takes no commission from buyers.' },
  { icon: 'map', title: 'The whole island on one map', text: 'From West Bay to Camp Bay, filter by price, title, oceanfront and readiness, then search the area you are looking at.' },
];

export default function AboutPage() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'AboutPage',
        url: `${SITE_URL}/about`,
        name: `About ${SITE_NAME}`,
        mainEntity: { '@id': `${SITE_URL}/#organization` },
      })} />
      <Crumbs items={crumbs} />

      <section className="hero hero--dark">
        <span className="hero__eyebrow">About Resoha</span>
        <h1>Every property on Roatán, checked before you fly</h1>
        <p className="hero__sub">
          Roatán has no MLS. Listings are scattered across dozens of agency sites and Facebook groups, prices disagree, sold
          homes stay online and agents need no licence. Buyers who live thousands of miles away are left to piece it together.
          Resoha brings the island’s listings into one place and makes the facts that protect your money visible.
        </p>
      </section>

      <section className="section">
        <div className="section__head"><h2>What we stand for</h2></div>
        <div className="grid grid--4 facts">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="fact">
              <span className="fact__ico"><Icon name={p.icon} size={22} /></span>
              <h3>{p.title}</h3>
              <p className="small muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--soft rounded">
        <div className="cta">
          <div className="prose prose--flush">
            <h2>Who Resoha is for</h2>
            <ul>
              <li><b>Retirees and future residents</b> from the US and Canada who want a home on the island and cannot afford a mistake.</li>
              <li><b>Investors</b> looking at holiday rentals who need honest numbers. See our <Link className="link-accent" href="/market">market report</Link>.</li>
              <li><b>Divers and returning visitors</b> who already love the island and want to know where to start.</li>
              <li><b>Hondurans abroad</b> buying for family or for retirement, remotely and safely.</li>
              <li><b>Island agencies and agents</b> who want serious buyers to find their listings. See <Link className="link-accent" href="/for-agents">for agents</Link>.</li>
            </ul>
          </div>
          <div className="panel">
            <h3>How Resoha works</h3>
            <ol className="steps-list">
              <li>Island agencies and agents publish their listings, or we load them on their behalf.</li>
              <li>Each listing keeps a link to its source, and land gets a land passport.</li>
              <li>You search the whole island, save listings and searches, and contact agents directly.</li>
              <li>The agent handles the viewing and the sale; your own attorney checks the title.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section prose prose--flush">
        <h2>The company</h2>
        <p>
          {SITE_NAME} is operated by {OPERATOR}. We are a listing platform, not a real-estate broker: listing details are
          published by the agency holding each property, and we never handle deposits or purchase funds.
        </p>
        <p>
          Contact:{' '}
          {CONTACT_EMAIL
            ? <a className="link-accent" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            : <>use the enquiry form on any listing and mention “Resoha support”.</>}
        </p>
        <p className="small muted">
          <Link className="link-accent" href="/privacy">Privacy policy</Link> · <Link className="link-accent" href="/terms">Terms of use</Link>
        </p>
      </section>
    </div>
  );
}
