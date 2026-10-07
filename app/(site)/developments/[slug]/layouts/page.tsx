import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentLayouts from '@/components/DevelopmentLayouts';
import DevelopmentShell from '@/components/DevelopmentShell';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'layouts', label: 'Layouts', about: 'Apartment layouts with floor plans, sizes, prices and availability.',
  });
}

export default async function LayoutsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  if (!ctx.units.length) notFound();
  return (
    <DevelopmentShell ctx={ctx} active="layouts" title="Layouts">
      <DevelopmentLayouts units={ctx.units} buildings={ctx.buildings} />
      <p className="tiny muted" style={{ marginTop: 18 }}>
        Prices from the developer&apos;s price list. Tap a unit number to open it; greyed-out units are reserved, sold or rented.
      </p>
    </DevelopmentShell>
  );
}
