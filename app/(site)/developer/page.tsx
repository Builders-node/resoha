import { redirect } from 'next/navigation';
import BecomeRealtor from '@/components/BecomeRealtor';
import LoginGate from '@/components/LoginGate';
import { getSession } from '@/lib/session';

/**
 * Вхід для забудовника. Кабінет один — /agent: проєкти, квартири, заявки, візити й компанія.
 * Сюди ведуть старі посилання й лист передачі профілю, тож просто відправляємо в потрібну вкладку.
 */
export default async function DeveloperPage() {
  const session = await getSession();
  if (!session) {
    return (
      <LoginGate
        role="agent"
        title="Developer cabinet"
        text="Projects, units, buyer enquiries, office visits and your company page, in one place."
      />
    );
  }
  if (session.role !== 'agent') return <BecomeRealtor name={session.name} developer />;
  redirect('/agent?tab=developer');
}
