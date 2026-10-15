import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogIndex from '@/components/BlogIndex';
import { TOPICS, topicBySlug } from '@/lib/content/blog';
import { localized } from '@/lib/seoMeta';
import { getT } from '@/lib/i18n/server';
import { SITE_NAME } from '@/lib/site';

export const dynamicParams = false;
export const generateStaticParams = () => TOPICS.map((t) => ({ topic: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const topic = topicBySlug((await params).topic);
  if (!topic) return {};
  const t = await getT();
  return localized(`/blog/topic/${topic.slug}`, {
    title: `${t(topic.name)}: ${t('Blog')} | ${SITE_NAME}`,
    description: t(topic.blurb),
  });
}

export default async function BlogTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const topic = topicBySlug((await params).topic);
  if (!topic) notFound();
  return <BlogIndex topic={topic.slug} />;
}
