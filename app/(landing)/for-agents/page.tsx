import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { getT, getLp } from '@/lib/i18n/server';
import { breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/for-agents', {
    title: `${t('List your Roatán properties for free')} | ${SITE_NAME} ${t('for agents')}`,
    description: t('Island agencies and agents list on Resoha for free. We load your listings for you, enquiries go straight to your WhatsApp, and your agency gets its own page.'),
  });
}

const OFFER = [
  { icon: 'plus', title: 'Free for founding partners', text: 'No listing fees and no commission for the first 12 months for agencies that join early.' },
  { icon: 'inbox', title: 'Leads straight to you', text: 'Buyers contact the listing agent by WhatsApp, phone or the enquiry form. We never sit between you and your client.' },
  { icon: 'list', title: 'We load your listings', text: 'Send us your current stock and we publish it for you, linked back to your own site.' },
  { icon: 'building', title: 'Your agency page', text: 'A public profile with your team, every listing you hold and buyer reviews.' },
];

const FAQ = [
  { q: 'What does it cost to list on Resoha?', a: 'Nothing for founding partners: no listing fees and no commission for the first 12 months. Resoha does not take a share of your sales commission.' },
  { q: 'Do buyers contact me or Resoha?', a: 'You. WhatsApp messages and calls go straight to your phone. Enquiry forms and visit bookings arrive by email and, if you connect it, in Telegram the moment they are sent, and appear in your agent dashboard.' },
  { q: 'Can my whole team join?', a: 'Yes. The agency owner creates the agency and shares an invite code; each agent then publishes and manages their own listings, and the owner sees the whole agency’s enquiries.' },
  { q: 'Will my listings be duplicated or out of date?', a: 'Each listing keeps a link to its source and the agent who holds it. You can edit, pause or remove listings at any time from your dashboard.' },
];

export default async function ForAgentsPage() {
  const lp = await getLp();
  const t = await getT();
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'For agents', path: '/for-agents' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqLd(FAQ))} />

      <section className="hero hero--dark">
        <span className="hero__eyebrow">{t('For agencies and agents on Roatán')}</span>
        <h1>{t('Put your listings where Roatán buyers search')}</h1>
        <p className="hero__sub">
          {t('Buyers start in Google and AI assistants, and they want the whole island in one place. Resoha gives them that, and sends every enquiry straight to the agent who holds the property.')}
        </p>
        <div className="hero__cta">
          <Link className="btn btn--orange btn--lg" href="/signup?as=agent">{t('Create a free agent account')} <Icon name="arrowRight" size={18} /></Link>
          {CONTACT_EMAIL && <a className="btn btn--lg hero__ghost" href={`mailto:${CONTACT_EMAIL}?subject=Founding%20partner`}>{t('Talk to us')}</a>}
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>{t('What you get')}</h2></div>
        <div className="grid grid--4 facts">
          {OFFER.map((o) => (
            <div key={o.title} className="fact">
              <span className="fact__ico"><Icon name={o.icon} size={22} /></span>
              <h3>{t(o.title)}</h3>
              <p className="small muted">{t(o.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--soft rounded">
        <div className="cta">
          <div>
            <h2>{t('Sell land faster with a land passport')}</h2>
            <p className="muted" style={{ fontSize: 16, margin: '12px 0 20px' }}>
              {t('Answer the eight questions every land buyer asks (title, road, power, water, survey, permit, zone, slope) once, on the listing. Complete lots get a readiness badge, their own filter and a PDF report buyers forward to their lawyers.')}
            </p>
            <Link className="btn btn--primary" href={lp('/land-passport')}>{t('How the land passport works')}</Link>
          </div>
          <div className="panel">
            <h3>{t('Getting started')}</h3>
            <ol className="steps-list">
              <li>{t('Create an agent account, or join your agency with its invite code.')}</li>
              <li>{t('Publish listings from your dashboard, or send us your stock to load.')}</li>
              <li>{t('Answer enquiries on WhatsApp and track views and leads in one place.')}</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="prose prose--flush">
        <h2>{t('Questions from agents')}</h2>
        <Faq items={FAQ} open={FAQ.length} />
      </section>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
