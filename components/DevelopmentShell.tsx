import Link from 'next/link';
import AgentContact from './AgentContact';
import Icon from './Icon';
import JsonLd from './JsonLd';
import { areaForNeighborhood } from '@/lib/content/areas';
import type { DevContext } from '@/lib/developmentPage';
import { fmtUsd } from '@/lib/format';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import { BUILDING_STAGES, salesLabel, stageLabel } from '@/lib/units';
import { getLp } from '@/lib/i18n/server';

/**
 * Каркас усіх сторінок ЖК, як у LUN: назва й адреса, вкладки (окремі сторінки),
 * праворуч — картка агента зі статусом продажів, а «хлібні крихти» — у самому низу.
 */
export default async function DevelopmentShell({ ctx, active, title, top, wide, children }: {
  ctx: DevContext;
  active: string;
  /** Підзаголовок вкладки: «Layouts», «Construction progress»… На огляді не потрібен */
  title?: string;
  /** Те, що йде на всю ширину над назвою, — галерея на огляді (як на сторінці оголошення: спершу фото) */
  top?: React.ReactNode;
  /** На всю ширину, без картки агента праворуч, як у LUN: «Contacts» (свої кнопки звʼязку) і «Layouts» (контакт у вікні планування) */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const lp = await getLp();
  const { dev, agent, me, buildings, tabs, leadUnit, from } = ctx;
  const area = areaForNeighborhood(dev.neighborhood);
  const areaPath = area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(dev.neighborhood)}`;
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Developments', path: '/developments' },
    { name: dev.name, path: `/developments/${dev.slug}` },
    ...(active !== 'overview' ? [{ name: tab.label, path: tab.href }] : []),
  ];

  // зведення по домах: «1 delivered · 2 under construction»
  const stageCounts = BUILDING_STAGES.map(([k]) => [k, buildings.filter((b) => b.stage === k).length] as const)
    .filter(([, n]) => n > 0).reverse();
  const statusBox = stageCounts.length > 0 || buildings.length > 0 ? (
    <ul className="feat__status">
      <li><Icon name="verified" size={18} /> {salesLabel(dev.sales)}</li>
      {stageCounts.map(([k, n]) => (
        <li key={k} className={`is-${k}`}>
          <Icon name={k === 'delivered' || k === 'built' ? 'check' : k === 'planned' ? 'deed' : 'crane'} size={18} />
          {n} {n === 1 ? 'building' : 'buildings'} · {stageLabel(k).toLowerCase()}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className="wrap">
      <JsonLd data={graph(breadcrumbLd(crumbs))} />

      {top}

      <div className="dhead">
        <div>
          <span className="dev__kicker">New development</span>
          <h1 className="dhead__title">{dev.name}{title && <span className="dhead__sub"> · {title}</span>}</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {dev.address && <>{dev.address} · </>}{dev.neighborhood}, {dev.island}, Bay Islands
          </p>
        </div>
        {from !== null && <div className="dhead__price"><span className="muted small">From </span>{fmtUsd(from)}</div>}
      </div>

      <nav className="dnav" aria-label={`${dev.name} sections`}>
        <div className="dnav__row">
          {tabs.map((t) => (
            <Link key={t.key} href={t.href} className={`dnav__tab${t.key === active ? ' is-on' : ''}`}
              aria-current={t.key === active ? 'page' : undefined}>{t.label}</Link>
          ))}
        </div>
      </nav>

      {wide ? <div className="dwide">{children}</div> : (
      <div className="prop">
        <div>{children}</div>
        {leadUnit && (
          <AgentContact agent={agent} listing={leadUnit} listingUrl={`${SITE_URL}${tab.href}`} topic={dev.name} fromPrice={from}
            extra={statusBox} sticky visitHref={dev.schedule.length ? `/developments/${dev.slug}/visit` : undefined} me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null} />
        )}
      </div>
      )}

      {/* «хлібні крихти» — унизу сторінки, щоб зверху були лише назва й вкладки */}
      <div className="crumbs crumbs--foot small muted">
        <Link href={lp('/')}>Home</Link> · <Link href={lp('/developments')}>Developments</Link> · <Link href={lp(areaPath)}>{dev.neighborhood}</Link>
        {' · '}<Link href={lp(`/developments/${dev.slug}`)}>{dev.name}</Link>
        {active !== 'overview' && <> · <span>{tab.label}</span></>}
      </div>
    </div>
  );
}
