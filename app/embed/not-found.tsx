import { getT } from '@/lib/i18n/server';

/** ЖК прибрали чи сховали: у віджеті — коротке повідомлення без каркаса сайту */
export default async function EmbedNotFound() {
  const t = await getT();
  return <p className="embed__empty muted">{t('This development is not available right now.')}</p>;
}
