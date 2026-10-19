import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Icon from '@/components/Icon';
import HomeTiles from '@/components/HomeTiles';
import AgencyRow from '@/components/AgencyRow';
import ListingCard from '@/components/ListingCard';
import Photo from '@/components/Photo';
import RecentlyViewed from '@/components/RecentlyViewed';
import HomeBlog from '@/components/HomeBlog';
import { agencyBoard, getFavorites, listDevelopments, listFeaturedBuildings, priceStatsRows, queryListings } from '@/lib/db';
import { CityPriceStats } from '@/components/PriceStats';
import { cityStats, statsPeriod, yearAgo } from '@/lib/priceStats';
import { fmtNumber, nListings } from '@/lib/format';
import { getSession } from '@/lib/session';
import { trackPromo } from '@/lib/promo';
import { areaForNeighborhood } from '@/lib/content/areas';
import { fromPrice, salesLabel, stageLabel } from '@/lib/units';
import { getLang, getLp } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n';
import { getMoney } from '@/lib/currencyServer';
import { cookies } from 'next/headers';
import { CITY_COOKIE, islandFor, regionBySlug } from '@/lib/regions';

export async function generateMetadata(): Promise<Metadata> {
  return localized('/');
}

/** Район із бази веде на сторінку-гайд району, якщо така є; інакше — на фільтр. */
function areaHref(name: string) {
  const area = areaForNeighborhood(name);
  return area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(name)}`;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const lp = await getLp();
  // місто з адреси (?city=slug, ?city=all), інакше — останній вибір з cookie
  const sp = await searchParams;
  const asked = Array.isArray(sp.city) ? sp.city[0] : sp.city;
  const city = regionBySlug(asked ?? (await cookies()).get(CITY_COOKIE)?.value ?? '');
  const inCity = (neighborhood: string, island?: string) => !city || islandFor(neighborhood, island) === city.name;
  const cityQ = city ? `&island=${encodeURIComponent(city.name)}` : '';
  // раніше ці шість запитів ішли один за одним — сторінка чекала на суму всіх затримок
  const [session, all, newest, board, allDevs, allBuildings, lang, allStatRows] = await Promise.all([
    getSession(),
    queryListings(city ? { island: city.name } : {}),
    queryListings({ sort: 'new', ...(city ? { island: city.name } : {}) }),
    agencyBoard(),
    listDevelopments(),
    listFeaturedBuildings(),
    getLang(),
    // статистика не має валити головну: без неї просто не буде блоку
    priceStatsRows(yearAgo()).catch(() => []),
  ]);
  const t = makeT(lang);
  const money = await getMoney();
  // усе наповнення головної — лише з обраного міста
  const devs = allDevs.filter((d) => inCity(d.neighborhood, d.island));
  const featuredBuildings = allBuildings.filter((b) => inCity(b.development.neighborhood));
  const statRows = allStatRows.filter((r) => inCity(r.neighborhood));
  const cityAgencies = new Set(all.map((l) => l.agencyId).filter(Boolean));
  const favIds = session ? await getFavorites(session.id) : [];

  // відмічені адміном ідуть першими, у порядку з вкладки Featured; решта — як прийшли (найновіші)
  // платне «Home page spot» (міграція 0060) — одразу за відміченими
  const onHome = (l: (typeof all)[number]) => l.featured || !!l.promo?.includes('homepage');
  const featured = [...all].sort((a, b) => Number(onHome(b)) - Number(onHome(a))
    || Number(b.featured) - Number(a.featured)
    || (a.featured ? a.featuredRank - b.featuredRank : 0)).slice(0, 4);
  // на невеликому каталозі обидва блоки показували майже одні й ті самі картки
  const featuredIds = new Set(featured.map((l) => l.id));
  const fresh = newest.filter((l) => !featuredIds.has(l.id)).slice(0, 4);

  // рахуємо і оренду теж, інакше район без продажу зникає з блоку;
  // «from» лишається ціною продажу — місячну ставку туди мішати не можна
  const byArea = new Map<string, { count: number; from: number }>();
  all.forEach((l) => {
    const cur = byArea.get(l.neighborhood) ?? { count: 0, from: Infinity };
    byArea.set(l.neighborhood, {
      count: cur.count + 1,
      from: l.deal === 'sale' ? Math.min(cur.from, l.price) : cur.from,
    });
  });
  const areas = [...byArea.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 4);

  // квартири ЖК — звичайні оголошення, тож кількість і ціну «від» беремо з уже завантаженого каталогу
  const devOrder = [...devs].sort((a, b) => Number(b.featured) - Number(a.featured)
    || (a.featured ? a.featuredRank - b.featuredRank : 0));
  const developments = devOrder.slice(0, 4).map((d) => {
    const units = all.filter((l) => l.developmentId === d.id);
    return { d, count: units.length, from: fromPrice(units.filter((u) => u.deal === 'sale')) };
  });

  const agencies = (city ? board.filter((b) => cityAgencies.has(b.agency.id)) : board).slice(0, 5);

  // покази платних кампаній: база рахує лише ті обʼєкти, що просуваються зараз
  await Promise.all([
    trackPromo('listing', featured, 'impression'),
    trackPromo('development', developments.map(({ d }) => d), 'impression'),
    trackPromo('building', featuredBuildings.slice(0, 8), 'impression'),
    trackPromo('agency', agencies.map((r) => ({ id: r.agency.id, featured: !!r.agency.featured })), 'impression'),
  ]);
  const agencyNameById = new Map(board.map((b) => [b.agency.id, b.agency.name]));

  return (
    <>
      <section className="wrap home-top">
        <HomeTiles city={city?.name ?? ''} />

        <aside className="promo">
          {/* єдиний h1 головної: позиціювання з маркетингової стратегії */}
          <h1>{t('Every property in Roatán, San Pedro Sula and Tegucigalpa, checked before you buy')}</h1>
          <p>
            {t('Homes, condos, rentals and land from local agencies in one place. Every listing links back to the agency that holds it, and every lot carries a land passport: title, road, power and water, confirmed or not.')}
          </p>
          <div className="promo__btns">
            <Link className="btn btn--orange btn--lg" href={lp(`/listings?deal=sale${cityQ}`)}>{t('Browse the listings')} <Icon name="arrowRight" size={18} /></Link>
            <Link className="btn btn--lg promo__ghost" href={lp('/land-passport')}>{t('How the land passport works')}</Link>
          </div>
        </aside>
      </section>

      {/* з localStorage: у нового відвідувача блоку немає */}
      <RecentlyViewed favIds={favIds} />

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('Featured listings')}</h2>
            <Link className="btn btn--primary" href={lp(`/listings?deal=sale${cityQ}`)}>{t('See all {n}', { n: nListings(all.filter((l) => l.deal === 'sale').length, lang) })} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {featured.map((l, i) => (
              <ListingCard key={l.id} listing={l} ratio="tall" isFav={favIds.includes(l.id)} eager={i === 0}
                agentName={agencyNameById.get(l.agencyId ?? '')} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('Browse by area')}</h2>
            <Link className="btn btn--primary" href={lp('/areas')}>{t('All areas compared')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {areas.map(([name, a]) => (
              <Link key={name} className="ov ov--area ov--plain"
                href={areaHref(name)}>
                <span className="ov__map" aria-hidden="true"><Icon name="pin" size={26} /></span>
                <div className="ov__b">
                  <div className="ov__title" style={{ fontSize: 20 }}>{name}</div>
                  <div className="ov__meta">
                    {nListings(a.count, lang)}{Number.isFinite(a.from) && ` · ${t('from {price}', { price: money.amount(a.from) })}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {fresh.length > 0 && (
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('Just listed')}</h2>
            <Link className="btn btn--primary" href={lp('/listings?deal=sale&sort=new')}>{t('All new listings')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {fresh.map((l) => (
              <ListingCard key={l.id} listing={l} ratio="tall" isFav={favIds.includes(l.id)}
                agentName={agencyNameById.get(l.agencyId ?? '')} />
            ))}
          </div>
        </div>
      </section>
      )}

      {developments.length > 0 && (
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('New developments')}</h2>
            <Link className="btn btn--primary" href={lp('/developments')}>{t('All developments')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {developments.map(({ d, count, from }) => (
              <Link key={d.id} href={lp(`/developments/${d.slug}`)} className="ov ov--tall">
                <Photo src={d.photos[0]} alt={d.name} />
                <div className="card__badges">
                  {d.featured && <span className="badge badge--featured"><Icon name="star" size={12} /> {t('Featured')}</span>}
                  <span className="badge badge--brand">{t(salesLabel(d.sales))}</span>
                </div>
                <div className="ov__b">
                  {d.developer && <div className="ov__agency">{d.developer}</div>}
                  <div className="ov__title">{d.name}</div>
                  <div className="ov__meta">{d.neighborhood} · {t('{n} units', { n: count })}{d.completion && ` · ${d.completion}`}</div>
                  {from !== null && <div className="ov__price">{t('From {price}', { price: money.amount(from) })}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {featuredBuildings.length > 0 && (
      <section className="section section--soft">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('Featured buildings')}</h2>
            <Link className="btn btn--primary" href={lp('/developments')}>{t('All developments')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {featuredBuildings.slice(0, 8).map((b) => (
              <Link key={b.id} href={lp(`/developments/${b.development.slug}/layouts`)} className="ov ov--tall">
                <Photo src={b.photo || b.development.photo} alt={`${b.name}, ${b.development.name}`} />
                <div className="card__badges"><span className="badge badge--brand">{t(stageLabel(b.stage))}</span></div>
                <div className="ov__b">
                  <div className="ov__agency">{b.development.name}</div>
                  <div className="ov__title">{b.name}</div>
                  <div className="ov__meta">
                    {[b.development.neighborhood, b.floors && t('{n} floors', { n: b.floors }), b.completion].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <CityPriceStats cities={cityStats(statRows)} period={statsPeriod()} />

      <HomeBlog lang={lang} t={t} lp={lp} />

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>{t('Real-estate agencies')}</h2>
            <Link className="btn btn--primary" href={lp('/agents')}>{t('All agents & agencies')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <AgencyRow rows={agencies} />
        </div>
      </section>

      <section className="section">
        <div className="wrap cta">
          <div>
            <h2 style={{ fontSize: 'var(--fs-h1)' }}>{t('Selling property in Honduras?')}</h2>
            <p className="muted" style={{ fontSize: 18, margin: '12px 0 24px' }}>
              {t('Publish listings, take enquiries from buyers flying in, and track views from your own dashboard.')}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="btn btn--primary btn--lg" href={lp('/for-agents')}>{t('List for free')}</Link>
              <Link className="btn btn--ghost btn--lg" href="/agent">{t('Agent dashboard')}</Link>
            </div>
          </div>
          {/* лише те, що щось означає: «Agencies 0» на головній працює проти запрошення,
              а просмотри накручуються публічним RPC */}
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', margin: 0 }}>
            <div className="stat"><span className="muted small">{t('Listings')}</span><b>{fmtNumber(all.length)}</b></div>
            <div className="stat"><span className="muted small">{t('Areas covered')}</span><b>{byArea.size}</b></div>
            <div className="stat"><span className="muted small">{t('For sale')}</span>
              <b>{fmtNumber(all.filter((l) => l.deal === 'sale').length)}</b></div>
            <div className="stat"><span className="muted small">{t('For rent')}</span>
              <b>{fmtNumber(all.filter((l) => l.deal === 'rent').length)}</b></div>
          </div>
        </div>
      </section>
    </>
  );
}
