import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import GuestSaved from '@/components/GuestSaved';
import { getSession } from '@/lib/session';
import { SITE_NAME } from '@/lib/site';

// список живе в браузері конкретної людини — індексувати нічого
export const metadata: Metadata = { title: `Saved listings | ${SITE_NAME}`, robots: { index: false } };

export default async function SavedPage() {
  // у залогіненого збережене в акаунті: вкладка «Saved» кабінету відкривається першою
  if (await getSession()) redirect('/account');
  return <GuestSaved />;
}
