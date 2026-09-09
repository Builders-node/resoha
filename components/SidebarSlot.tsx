import Sidebar from './Sidebar';
import { getSession } from '@/lib/session';

/**
 * Сесію тягне сам сайдбар, а не layout: інакше все дерево чекало б на похід
 * у Supabase Auth ще до того, як почне рендеритись сторінка.
 */
export default async function SidebarSlot() {
  const session = await getSession();
  return <Sidebar session={session} />;
}
