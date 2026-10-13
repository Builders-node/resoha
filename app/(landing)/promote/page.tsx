import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ListingCard from '@/components/ListingCard';
import { listDevelopments, queryListings } from '@/lib/db';
import { fmtNumber } from '@/lib/format';
import { getT, getLp } from '@/lib/i18n/server';
import { PROMO_PRODUCTS, fmtMoney, listPackages, type PromoKind, type PromoPackage, type PromoProduct } from '@/lib/promo';
import { CITY_COOKIE, DEFAULT_REGION, REGIONS, islandFor, regionBySlug } from '@/lib/regions';
import { breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { localized } from '@/lib/seoMeta';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/promote', {
    title: `${t('Promote your listings and developments')} | ${SITE_NAME}`,
    description: t('Sponsored places in search, a spot on the home page, a coloured frame and a Featured badge for listings, developments, buildings and agencies on Resoha, with views and enquiries measured before and after.'),
  });
}

/** Порядок, у якому види просування стоять на сторінці: від найсильнішого місця до разової дії. */
const LISTING_PRODUCTS: PromoProduct[] = ['top', 'homepage', 'featured', 'highlight', 'premium_agent', 'bump'];

const OTHER_KINDS: { kind: PromoKind; icon: string; title: string; text: string }[] = [
  { kind: 'development', icon: 'building', title: 'Development', text: 'Featured on the home page and first in the new-builds catalogue.' },
  { kind: 'building', icon: 'layers', title: 'One building', text: 'One building of a development shown among the featured buildings on the home page.' },
  { kind: 'agency', icon: 'briefcase', title: 'Agency', text: 'Your agency first in the agencies list and on the home page.' },
];

const TOOLS = [
  { icon: 'chart', title: 'Views and enquiries, before and after', text: 'Each campaign shows impressions, clicks and click rate, and compares views and enquiries with the same number of days before it started.' },
  { icon: 'inbox', title: 'Every enquiry in one inbox', text: 'WhatsApp, calls, forms and visit bookings land in your Leads tab, by email and in Telegram the moment they are sent.' },
  { icon: 'calendar', title: 'Sales-office visits', text: 'Developments take visit bookings by time slot, so promoted traffic turns into people at your sales office.' },
  { icon: 'bell', title: 'Renewal reminders', text: 'We email you before a campaign ends, with a link that extends it in one click.' },
];

const FAQ = [
  { q: 'How are paid places marked?', a: 'Honestly. Listings in the paid places above search results carry a “Sponsored” label; other promoted items get a Featured badge or a coloured frame. Buyers always know what is paid.' },
  { q: 'Does it work in every city?', a: 'Yes. A promoted listing or development is shown in the city it is in: Roatán, San Pedro Sula or Tegucigalpa. Prices are the same in every city.' },
  { q: 'How many Sponsored places are there?', a: 'Up to two above each search, and only for searches the listing matches. If more listings are promoted, they take turns, so nobody buys a place that is never shown.' },
  { q: 'How do I pay?', a: 'By card through Stripe, in US dollars. A campaign starts as soon as the payment goes through. If card payment is not switched on yet, our team confirms the payment and starts the campaign by hand.' },
  { q: 'Can I stop a campaign or get a refund?', a: 'Write to us and our team will sort it out. Any refund shows in your payment history in the Promote tab.' },
  { q: 'Do I have to promote to be on Resoha?', a: 'Promotion is optional. Publishing listings, developments and your agency page does not require it; promotion only buys extra visibility.' },
];

/** Нижче цього перегляди радше відлякують, ніж продають, тож блок їх не показує. */
const VIEWS_WORTH_SHOWING = 1000;

function priceTable(packages: PromoPackage[], kind: PromoKind, product: PromoProduct) {
  return packages.filter((p) => p.kind === kind && p.product === product).sort((a, b) => a.days - b.days);
}

export default async function PromotePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const lp = await getLp();
  const t = await getT();
  const sp = await searchParams;
  const asked = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  const region = regionBySlug(asked ?? (await cookies()).get(CITY_COOKIE)?.value ?? '') ?? DEFAULT_REGION;

  // ні ціни, ні статистика не мають валити сторінку: без них просто не буде блоку
  const [listings, allDevs, packages] = await Promise.all([
    queryListings({ island: region.name }).catch(() => []),
    listDevelopments().catch(() => []),
    listPackages().catch(() => [] as PromoPackage[]),
  ]);
  const devs = allDevs.filter((d) => islandFor(d.neighborhood, d.island) === region.name);
  const views = listings.reduce((s, l) => s + (l.views ?? 0), 0);
  const areas = new Set(listings.map((l) => l.neighborhood).filter(Boolean)).size;
  // молодий каталог: показуємо лише ті цифри, якими не соромно продавати
  const stats = [
    { label: 'Properties for sale and rent', value: listings.length },
    { label: 'New developments', value: devs.length },
    { label: 'Neighbourhoods covered', value: areas },
    { label: 'Listing views so far', value: views, min: VIEWS_WORTH_SHOWING },
  ].filter((st) => st.value >= (st.min ?? 1));
  const fromPrice = packages.length ? Math.min(...packages.map((p) => p.priceCents)) : 0;

  // як це виглядає: справжні оголошення міста з найбільшою кількістю переглядів
  const sample = [...listings].filter((l) => l.photos.length).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 3);
  const preview = [
    sample[0] && { l: { ...sample[0], sponsored: true }, title: 'Top of search', text: 'Above the results, labelled Sponsored.' },
    sample[1] && { l: { ...sample[1], featured: true, promo: ['highlight' as const] }, title: 'Colour highlight', text: 'An orange frame in every list.' },
    sample[2] && { l: { ...sample[2], featured: true }, title: 'Featured', text: 'A badge, the home page and the first places.' },
  ].filter(Boolean) as { l: (typeof sample)[number]; title: string; text: string }[];

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'For agents', path: '/for-agents' }, { name: 'Promotion', path: '/promote' }];

  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqLd(FAQ))} />

      <section className="hero hero--dark">
        <span className="hero__eyebrow">{t('Promotion on Resoha')}</span>
        <h1>{t('Be the first thing buyers see in {city}', { city: region.name })}</h1>
        <p className="hero__sub">
          {t('Sponsored places in search, a spot on the home page and a coloured frame for your listings, plus featured places for developments, buildings and agencies. Pay per week, see every view and enquiry it brings.')}
        </p>
        <div className="hero__cta">
          <Link className="btn btn--orange btn--lg" href="/agent?tab=promote">{t('Start promoting')} <Icon name="arrowRight" size={18} /></Link>
          {CONTACT_EMAIL && <a className="btn btn--lg hero__ghost" href={`mailto:${CONTACT_EMAIL}?subject=Promotion`}>{t('Talk to us')}</a>}
        </div>
        <nav className="boost-cities" aria-label={t('City')}>
          {REGIONS.map((r) => (
            <Link key={r.slug} href={lp(`/promote?region=${r.slug}`)} scroll={false}
              className={`boost-city${r.slug === region.slug ? ' is-on' : ''}`} aria-current={r.slug === region.slug ? 'page' : undefined}>
              {r.name}
            </Link>
          ))}
        </nav>
      </section>

      {stats.length > 0 && <section className="section">
        <div className="section__head">
          <h2>{t('Your audience in {city}', { city: region.name })}</h2>
          <p>{t('Live numbers from Resoha. Promotion puts your property in front of the people already searching here.')}</p>
        </div>
        <div className="stats boost-stats">
          {stats.map((st) => (
            <div key={st.label} className="stat"><span className="small muted">{t(st.label)}</span><b>{fmtNumber(st.value)}</b></div>
          ))}
        </div>
      </section>}

      {preview.length > 0 && (
        <section className="section section--soft rounded">
          <div className="section__head">
            <h2>{t('What buyers see')}</h2>
            <p>{t('Real listings from {city}, shown the way each kind of promotion shows them.', { city: region.name })}</p>
          </div>
          <div className="grid grid--3 boost-preview">
            {preview.map((p) => (
              <div key={p.title} className="boost-preview__item">
                <ListingCard listing={p.l} ratio="wide" />
                <h3>{t(p.title)}</h3>
                <p className="small muted">{t(p.text)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2>{t('Promote a listing')}</h2>
          <p>
            {fromPrice
              ? t('Combine them as you like. Prices in US dollars, from {price}.', { price: fmtMoney(fromPrice) })
              : t('Combine them as you like. Prices in US dollars.')}
          </p>
        </div>
        <div className="boost-plans">
          {LISTING_PRODUCTS.map((key) => {
            const prod = PROMO_PRODUCTS[key];
            const rows = priceTable(packages, 'listing', key);
            return (
              <article key={key} className={`boost-plan${key === 'top' ? ' boost-plan--hot' : ''}`}>
                {key === 'top' && <span className="boost-plan__tag">{t('Most enquiries')}</span>}
                <span className="fact__ico"><Icon name={prod.icon} size={24} /></span>
                <h3>{t(prod.label)}</h3>
                <p className="small muted">{t(prod.blurb)}</p>
                {rows.length > 0 && (
                  <ul className="boost-plan__prices">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <span>{prod.once ? t('Once') : t('{n} days', { n: r.days })}</span>
                        <b>{fmtMoney(r.priceCents, r.currency)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>{t('Developers and agencies')}</h2>
          <p>{t('Featured places for a whole development, one building or your agency.')}</p>
        </div>
        <div className="boost-plans">
          {OTHER_KINDS.map((k) => {
            const rows = priceTable(packages, k.kind, 'featured');
            return (
              <article key={k.kind} className="boost-plan">
                <span className="fact__ico"><Icon name={k.icon} size={24} /></span>
                <h3>{t(k.title)}</h3>
                <p className="small muted">{t(k.text)}</p>
                {rows.length > 0 && (
                  <ul className="boost-plan__prices">
                    {rows.map((r) => (
                      <li key={r.id}><span>{t('{n} days', { n: r.days })}</span><b>{fmtMoney(r.priceCents, r.currency)}</b></li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section section--soft rounded">
        <div className="section__head">
          <h2>{t('See what you get for the money')}</h2>
          <p>{t('Everything below comes with your free agent or developer account.')}</p>
        </div>
        <div className="grid grid--4 facts boost-tools">
          {TOOLS.map((o) => (
            <div key={o.title} className="fact">
              <span className="fact__ico"><Icon name={o.icon} size={22} /></span>
              <h3>{t(o.title)}</h3>
              <p className="small muted">{t(o.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta">
          <div>
            <h2>{t('Three steps to start')}</h2>
            <ol className="steps-list">
              <li>{t('Open the Promote tab in your dashboard, or press Promote next to a listing or development.')}</li>
              <li>{t('Choose what to promote, the kind of promotion and for how long.')}</li>
              <li>{t('Pay by card. The campaign starts at once and its numbers appear in the same tab.')}</li>
            </ol>
          </div>
          <div className="panel">
            <h3>{t('Not on Resoha yet?')}</h3>
            <p className="small muted" style={{ margin: '8px 0 16px' }}>
              {t('Create a free account, publish your listings or development, and promote them when you are ready.')}
            </p>
            <div className="hero__cta">
              <Link className="btn btn--primary" href="/agent?tab=promote">{t('Start promoting')}</Link>
              <Link className="btn btn--ghost" href={lp('/for-agents')}>{t('For agents')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="prose prose--flush">
        <h2>{t('Questions about promotion')}</h2>
        <Faq items={FAQ} open={2} />
      </section>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
