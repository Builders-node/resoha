import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentLayouts from '@/components/DevelopmentLayouts';
import DevelopmentShell from '@/components/DevelopmentShell';
import { LEVEL_PLANS } from '@/lib/content/levelPlans';
import { getFavorites } from '@/lib/db';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';
import { getT } from '@/lib/i18n/server';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'layouts', label: 'Layouts', about: 'Apartment layouts with floor plans, sizes, prices per m² and availability.',
  });
}

export default async function LayoutsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  if (!ctx.units.length) notFound();
  const { dev, agent, me } = ctx;
  const [favIds, t] = await Promise.all([me ? getFavorites(me.id) : Promise.resolve([] as string[]), getT()]);
  return (
    <DevelopmentShell ctx={ctx} active="layouts" title="Layouts" wide>
      <DevelopmentLayouts units={ctx.units} buildings={ctx.buildings} agent={agent}
        dev={{ name: dev.name, slug: dev.slug, completion: dev.completion, payment: dev.payment }}
        me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null}
        favIds={favIds} levelPlans={LEVEL_PLANS[dev.slug] ?? {}}
        visitHref={dev.schedule.length ? `/developments/${dev.slug}/visit` : undefined} />
      <p className="tiny muted" style={{ marginTop: 28 }}>
        {t('Prices from the developer’s price list. Floor plans are taken from the developer’s documents; tap a layout to see its units, floor plan and payment options.')}
      </p>
    </DevelopmentShell>
  );
}
