import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import Rich, { plain } from '@/components/Rich';
import SourceList from '@/components/SourceList';
import { HELP_ITEMS, HELP_SECTIONS, HELP_UPDATED } from '@/lib/content/help';
import { fmtDate } from '@/lib/format';
import { breadcrumbLd, graph } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site';

const TITLE = 'Buying property on Roatán: questions and answers';
const DESCRIPTION = 'Straight answers about buying a home, condo or land on Roatán: foreign ownership and the 3,000 m² rule, prices, closing costs, taxes, title checks, rentals and how Resoha works.';

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/faq', type: 'website' },
};

export default function FaqLanding() {
  const url = `${SITE_URL}/faq`;
  return (
    <>
      <JsonLd data={graph(
        {
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          url,
          name: TITLE,
          description: DESCRIPTION,
          dateModified: HELP_UPDATED,
          inLanguage: 'en',
          publisher: { '@id': `${SITE_URL}/#organization` },
          mainEntity: HELP_ITEMS.map((it) => ({
            '@type': 'Question',
            name: it.q,
            url: `${url}#${it.id}`,
            acceptedAnswer: { '@type': 'Answer', text: it.a.map(plain).join(' ') },
          })),
        },
        breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Questions and answers', path: '/faq' }]),
      )} />

      <section className="lp-hero" id="top">
        <div className="lp-wrap">
          <span className="lp-hero__eyebrow">Resoha help centre</span>
          <h1>{TITLE}</h1>
          <p className="lp-hero__lead">
            Everything buyers from abroad ask before they fly to Roatán, answered in plain language. Every figure
            links to its source, and each answer starts with the short version.
          </p>
          <p className="lp-hero__meta">
            {HELP_ITEMS.length} answers · {HELP_SECTIONS.length} topics · Updated <time dateTime={HELP_UPDATED}>{fmtDate(HELP_UPDATED)}</time>
          </p>

          <div className="lp-topics">
            {HELP_SECTIONS.map((s) => (
              <a key={s.id} className="lp-topic" href={`#${s.id}`}>
                <span className="lp-topic__ico"><Icon name={s.icon} size={22} /></span>
                <b>{s.title}</b>
                <span className="tiny">{s.items.length} questions</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="lp-wrap lp-body">
        <aside className="lp-side" aria-label="Topics">
          <b className="tiny">Topics</b>
          <ol>
            {HELP_SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
          </ol>
          <Link className="btn btn--primary btn--block btn--sm" href="/listings?deal=sale">Browse listings</Link>
        </aside>

        <div className="lp-content">
          {HELP_SECTIONS.map((s, si) => (
            <section key={s.id} id={s.id} className="lp-sec">
              <div className="lp-sec__head">
                <span className="lp-sec__num">{String(si + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{s.title}</h2>
                  <p className="muted">{s.lead}</p>
                </div>
              </div>

              <nav className="lp-toc" aria-label={`Questions about ${s.title}`}>
                <ol>
                  {s.items.map((it) => <li key={it.id}><a href={`#${it.id}`}>{it.q}</a></li>)}
                </ol>
              </nav>

              {s.items.map((it) => (
                <article key={it.id} id={it.id} className="lp-qa">
                  <h3><a href={`#${it.id}`} className="lp-qa__anchor" aria-label="Link to this answer">#</a>{it.q}</h3>
                  {it.a.map((p, i) => <p key={i}><Rich text={p} /></p>)}
                </article>
              ))}

              <div className="lp-sec__foot">
                {s.sources && s.sources.length > 0 && (
                  <details className="lp-src">
                    <summary className="small muted">Sources for this section</summary>
                    <SourceList sources={s.sources} />
                  </details>
                )}
                <a className="small lp-top" href="#top">Back to top ↑</a>
              </div>
            </section>
          ))}

          <p className="tiny muted lp-disclaimer">
            This page is general information, not legal or tax advice. Rules and fees change; confirm every step with a
            Honduran attorney before you pay a deposit.
          </p>
        </div>
      </div>

      <section className="lp-cta">
        <div className="lp-wrap lp-cta__in">
          <div>
            <h2>Didn’t find your answer?</h2>
            <p>Ask an island agent directly, or browse what is for sale right now.</p>
          </div>
          <div className="lp-cta__btns">
            <Link className="btn btn--orange btn--lg" href="/listings?deal=sale">Browse listings <Icon name="arrowRight" size={18} /></Link>
            <Link className="btn btn--lg lp-cta__ghost" href="/agents">Find an agent</Link>
            {CONTACT_EMAIL && <a className="btn btn--lg lp-cta__ghost" href={`mailto:${CONTACT_EMAIL}`}>Write to us</a>}
          </div>
        </div>
      </section>
    </>
  );
}
