import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentDocs from '@/components/DevelopmentDocs';
import DevelopmentShell from '@/components/DevelopmentShell';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'documents', label: 'Documents', about: 'Land title, construction permits, licences and the companies behind the project.',
  });
}

export default async function DocumentsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  if (!ctx.docs.length) notFound();
  return (
    <DevelopmentShell ctx={ctx} active="documents" title="Documents">
      <DevelopmentDocs docs={ctx.docs} />
    </DevelopmentShell>
  );
}
