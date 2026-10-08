import DeveloperPanel from '@/components/DeveloperPanel';
import LoginGate from '@/components/LoginGate';
import { getSession } from '@/lib/session';

/** Кабінет забудовника: будь-який акаунт заводить і веде сторінку своєї компанії */
export default async function DeveloperPage() {
  const session = await getSession();
  if (!session) {
    return (
      <LoginGate
        role="agent"
        title="Developer profile"
        text="Create your company page: logo, contacts and every project you build on the island, in one place."
      />
    );
  }
  return (
    <div className="wrap" style={{ padding: '32px 32px 60px', maxWidth: 900 }}>
      <DeveloperPanel />
    </div>
  );
}
