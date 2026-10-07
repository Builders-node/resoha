import AgentDashboard from '@/components/AgentDashboard';
import BecomeRealtor from '@/components/BecomeRealtor';
import LoginGate from '@/components/LoginGate';
import { getSession } from '@/lib/session';

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) {
    return (
      <LoginGate
        role="agent"
        title="Agent dashboard"
        text="Publish listings, answer buyer enquiries and track views. Independent realtors and agencies both live here."
      />
    );
  }
  // один акаунт на людину: покупець стає ріелтором тут же, без нової реєстрації
  if (session.role !== 'agent') return <BecomeRealtor name={session.name} />;

  const { tab } = await searchParams;
  return <AgentDashboard session={session} initialTab={tab === 'team' || tab === 'developments' || tab === 'developer' || tab === 'analytics' || tab === 'promote' ? tab : undefined} />;
}
