import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

/** Окремої сторінки входу немає: старі посилання відкривають модалку на головній. */
export default async function LoginPage() {
  const session = await getSession();
  redirect(session ? (session.role === 'agent' ? '/agent' : '/account') : '/?auth=login');
}
