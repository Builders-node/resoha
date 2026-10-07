import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentBuildings from '@/components/DevelopmentBuildings';
import DevelopmentProgress from '@/components/DevelopmentProgress';
import DevelopmentShell from '@/components/DevelopmentShell';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ building?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'construction', label: 'Construction progress', about: 'Construction status of every building and monthly site photos.',
  });
}

export default async function ConstructionPage({ params, searchParams }: Props) {
  const [ctx, { building = '' }] = await Promise.all([developmentContext((await params).slug), searchParams]);
  const { dev, buildings, units, progress, base } = ctx;
  if (!progress.length && !buildings.length) notFound();
  return (
    <DevelopmentShell ctx={ctx} active="construction" title="Construction progress">
      {buildings.length > 0 && (
        <section className="dev" style={{ marginTop: 0 }}>
          <h2 className="dev__title">{buildings.length > 1 ? 'Buildings' : 'Construction status'}</h2>
          {/* у вкладці картка дому веде на фото саме цього дому */}
          <DevelopmentBuildings buildings={buildings} units={units} fallbackPhoto={dev.photos[0] ?? ''}
            hrefFor={(b) => `${base}/construction?building=${b.id}`} />
        </section>
      )}
      <section className="dev">
        <h2 className="dev__title">Site photos</h2>
        <DevelopmentProgress entries={progress} buildings={buildings} building={building} base={base} name={dev.name} />
      </section>
    </DevelopmentShell>
  );
}
