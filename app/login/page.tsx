import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/AuthForms';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Sign in — Resoha Roatán' };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === 'agent' ? '/agent' : '/account');
  return <LoginForm />;
}
