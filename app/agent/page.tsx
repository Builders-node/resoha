import AgentDashboard from '@/components/AgentDashboard';
import LoginGate from '@/components/LoginGate';
import { getSession } from '@/lib/session';

export default async function AgentPage() {
  const session = await getSession();
  if (session?.role !== 'agent') {
    return (
      <LoginGate
        role="agent"
        title="Agent dashboard"
        text="Publish listings, answer buyer enquiries and track views. Independent realtors and agencies both live here."
      />
    );
  }
  return <AgentDashboard session={session} />;
}
