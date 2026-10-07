import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAgent, getDevelopment, listBuildings, listDocuments, listNews, listProgress, queryListings } from './db';
import { currentUser } from './session';
import { fromPrice } from './units';
import { SITE_NAME } from './site';

/**
 * Усе, що потрібно кожній сторінці ЖК (огляд і вкладки): сам ЖК, автор, квартири, доми,
 * документи, хід будівництва, новини — і які вкладки показувати. cache — один запит на рендер.
 */
export const loadDevelopment = cache(getDevelopment);

export const developmentContext = cache(async (slug: string) => {
  const dev = await loadDevelopment(slug);
  if (!dev) notFound();
  const [agent, me, units, buildings, docs, progress, news] = await Promise.all([
    getAgent(dev.agentId),
    currentUser(),
    queryListings({ developmentId: dev.id, sort: 'price_asc' }),
    listBuildings(dev.id),
    listDocuments(dev.id),
    listProgress(dev.id),
    listNews(dev.id),
  ]);
  // Автор може бути прихованим (заблокований акаунт) — тоді й ЖК не показуємо
  if (!agent) notFound();

  const base = `/developments/${dev.slug}`;
  // вкладки, як у LUN; порожні не показуємо
  const tabs = [
    { href: base, key: 'overview', label: 'Overview' },
    units.length > 0 && { href: `${base}/layouts`, key: 'layouts', label: 'Layouts' },
    (progress.length > 0 || buildings.length > 0) && { href: `${base}/construction`, key: 'construction', label: 'Construction' },
    docs.length > 0 && { href: `${base}/documents`, key: 'documents', label: 'Documents' },
    (dev.video || dev.tour) && { href: `${base}/tour`, key: 'tour', label: dev.tour ? 'Video & 360°' : 'Video' },
    { href: `${base}/contacts`, key: 'contacts', label: 'Contacts' },
    news.length > 0 && { href: `${base}/news`, key: 'news', label: 'News' },
  ].filter(Boolean) as DevTab[];

  return {
    dev, agent, me, units, buildings, docs, progress, news, tabs, base,
    from: fromPrice(units.filter((u) => u.deal === 'sale')),
    // заявку з форми привʼязуємо до найдешевшої вільної квартири — лід завжди про конкретний обʼєкт
    // Ціна «From» рахується з продажу, тож і квартира для картки — на продаж, інакше вийде «$107,207/mo»
    leadUnit: units.find((u) => u.deal === 'sale' && u.status === 'available')
      ?? units.find((u) => u.status === 'available') ?? units[0],
  };
});

export type DevTab = { href: string; key: string; label: string };
export type DevContext = Awaited<ReturnType<typeof developmentContext>>;

/** Метадані сторінки ЖК; для вкладки — з її назвою й своїм canonical */
export async function developmentMetadata(slug: string, tab?: { path: string; label: string; about: string }): Promise<Metadata> {
  const d = await loadDevelopment(slug);
  if (!d) return { title: `Development not found — ${SITE_NAME}` };
  const title = tab ? `${d.name}: ${tab.label.toLowerCase()} — ${d.neighborhood}, Roatán`
    : `${d.name} — new development in ${d.neighborhood}, Roatán`;
  const description = (tab ? tab.about
    : d.text || `${d.name}: apartments for sale and rent in ${d.neighborhood}, Roatán.`).slice(0, 200);
  const url = `/developments/${d.slug}${tab ? `/${tab.path}` : ''}`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: SITE_NAME, images: d.photos.slice(0, 1) },
  };
}
