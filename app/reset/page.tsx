import { redirect } from 'next/navigation';
import { ResetForm } from '@/components/AuthForms';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Set a new password — Resoha Roatán' };

export default async function ResetPage() {
  // Сюди потрапляють лише за посиланням з листа — /auth/callback уже видав сесію
  const session = await getSession();
  if (!session) redirect('/forgot');
  return <ResetForm />;
}
