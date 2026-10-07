import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentMedia from '@/components/DevelopmentMedia';
import DevelopmentShell from '@/components/DevelopmentShell';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'tour', label: 'Video & 360° tour', about: 'Video walkthrough, drone flyover and 360° tour of the development.',
  });
}

export default async function TourPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  const { dev } = ctx;
  if (!dev.video && !dev.tour) notFound();
  return (
    <DevelopmentShell ctx={ctx} active="tour" title={dev.tour ? 'Video & 360° tour' : 'Video'}>
      <DevelopmentMedia video={dev.video} tour={dev.tour} name={dev.name} />
    </DevelopmentShell>
  );
}
