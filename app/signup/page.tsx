import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/AuthForms';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Create an account — Resoha Roatán' };

type SP = Record<string, string | string[] | undefined>;

export default async function SignupPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (session) redirect(session.role === 'agent' ? '/agent' : '/account');

  const raw = (await searchParams).as;
  const as = Array.isArray(raw) ? raw[0] : raw;
  const mode = as === 'agent' || as === 'agency' || as === 'buyer' ? as : 'buyer';

  return <SignupForm initialMode={mode} />;
}
