import { redirect } from 'next/navigation';
import { isAuthMode } from '@/lib/auth-modal';
import { getSession } from '@/lib/session';

type SP = Record<string, string | string[] | undefined>;

/** Реєстрація теж у модалці; ?as=agent|agency зберігаємо, щоб відкрити потрібну вкладку. */
export default async function SignupPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (session) redirect(session.role === 'agent' ? '/agent' : '/account');

  const raw = (await searchParams).as;
  const as = Array.isArray(raw) ? raw[0] : raw;
  redirect(isAuthMode(as) ? `/?auth=signup&as=${as}` : '/?auth=signup');
}
