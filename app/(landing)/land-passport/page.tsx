import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { queryListings } from '@/lib/db';
import { LAND_FIELDS, isChecked } from '@/lib/land';
import { getT } from '@/lib/i18n/server';
import { breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `Land passport: check a Roatán lot before you buy | ${SITE_NAME}`,
  description: 'Every land listing on Resoha carries a land passport: title, road, electricity, water, survey, ZOLITUR permit, zone and slope, with who checked it and when. Free PDF report.',
  alternates: { canonical: '/land-passport' },
};

const WHY: Record<string, string> = {
  titleStatus: 'Registered, free-and-clear title at the Instituto de la Propiedad is the single most important fact about a lot.',
  roadAccess: 'A lot without legal road access may be impossible to build on or to resell.',
  power: 'Bringing a RECO line from far away can cost more than the lot itself.',
  water: 'Wells, cisterns and municipal supply each change the cost of building and living.',
  survey: 'A topographic survey on file confirms boundaries and size, including the 3,000 m² limit for foreign individuals.',
  zolitur: 'ZOLITUR, the Bay Islands tourism free zone authority, issues building permits on the islands.',
  zone: 'Protected areas, mangroves and coastal setbacks limit what you can build.',
  slope: 'Steep lots have views, and higher foundation and access costs.',
};

const FAQ = [
  { q: 'What does “Ready to build” mean?', a: 'A lot is marked Ready to build when four core facts are all confirmed: registered free-and-clear title, road access, electricity at or near the lot, and a water source. Two or three of them gives “Needs work”; fewer gives “Raw land”.' },
  { q: 'Who fills in the land passport?', a: 'The listing agent fills it in from documents and site visits, and the passport shows who checked it and on which date. Items nobody has confirmed are shown as “Not confirmed”, never guessed.' },
  { q: 'Is the land passport a legal title guarantee?', a: 'No. It is a structured record of what has been confirmed about the lot. Always have your own Honduran attorney check the title at the Instituto de la Propiedad before paying a deposit.' },
  { q: 'Does the land passport cost anything?', a: 'No. The passport and its PDF report are free for buyers and for agents listing land on Resoha.' },
];

export default async function LandPassportPage() {
  const t = await getT();
  const land = await queryListings({ type: 'land' });
  const checked = land.filter((l) => isChecked(l.land)).length;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Land passport', path: '/land-passport' }];

  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqLd(FAQ), {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/land-passport`,
        name: 'Resoha land passport',
        description: 'A standard checklist of title, access, utilities, permits, zone and slope for every land listing on Roatán.',
      })} />

      <section className="hero hero--dark">
        <span className="hero__eyebrow">{t('Free for every lot on Resoha')}</span>
        <h1>{t('The land passport: know what you are buying before you fly')}</h1>
        <p className="hero__sub">
          {t('Buying land on Roatán means asking the same eight questions about every lot. The land passport puts the answers in one place, marks what is confirmed and what is not, and shows who checked it and when.')}
        </p>
        <div className="hero__cta">
          <Link className="btn btn--orange btn--lg" href="/listings?type=land&ready=1">{t('Ready-to-build land')} <Icon name="arrowRight" size={18} /></Link>
          <Link className="btn btn--lg hero__ghost" href="/listings?type=land">{t('All land & lots')}</Link>
        </div>
        {land.length > 0 && (
          <p className="tiny hero__note">{t('{checked} of {total} land listings on Resoha have a completed passport.', { checked, total: land.length })}</p>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>{t('Eight facts, checked for every lot')}</h2>
          <p>{t('The first four decide the readiness score. The rest tell you what building will involve.')}</p>
        </div>
        <div className="grid grid--4 facts">
          {LAND_FIELDS.map((f) => (
            <div key={f.key} className="fact">
              <span className={`fact__tag ${f.good ? 'fact__tag--core' : ''}`}>{f.good ? t('Core') : t('Building')}</span>
              <h3>{t(f.label)}</h3>
              <p className="small muted">{t(WHY[f.key])}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--soft rounded">
        <div className="steps">
          <div>
            <span className="land__score land__score--ok">{t('Ready to build')} · 4/4</span>
            <p className="small">{t('Title, road, power and water all confirmed.')}</p>
          </div>
          <div>
            <span className="land__score land__score--warn">{t('Needs work')} · 2–3/4</span>
            <p className="small">{t('Buildable, but budget time and money for what is missing.')}</p>
          </div>
          <div>
            <span className="land__score land__score--bad">{t('Raw land')} · 0–1/4</span>
            <p className="small">{t('Priced for its potential. Expect a long road to a house.')}</p>
          </div>
          <div>
            <span className="land__score land__score--muted">{t('Not checked yet')}</span>
            <p className="small">{t('Nobody has confirmed the facts. Ask the agent before you commit.')}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="cta">
          <div>
            <h2>{t('Download it, send it to your lawyer')}</h2>
            <p className="muted" style={{ fontSize: 16, margin: '12px 0 0' }}>
              {t('Every passport can be downloaded as a one-page PDF report with the lot’s details, the eight facts, the readiness score and the date of the check. It is the fastest way to brief your attorney and compare lots side by side.')}
            </p>
          </div>
          <div className="panel">
            <h3>{t('Selling land?')}</h3>
            <p className="small muted" style={{ margin: '8px 0 16px' }}>
              {t('A completed passport answers buyers’ first questions before they ask, and lots marked Ready to build can be found with their own filter.')}
            </p>
            <Link className="btn btn--primary" href="/for-agents">{t('List land on Resoha')}</Link>
          </div>
        </div>
      </section>

      <section className="prose prose--flush">
        <h2>{t('Land passport: questions')}</h2>
        <Faq items={FAQ} open={FAQ.length} />
        <p className="small muted">
          {t('Learn more in')} <Link className="link-accent" href="/guides/how-to-check-land-title-in-roatan">{t('how to check a land title on Roatán')}</Link>.
        </p>
      </section>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
