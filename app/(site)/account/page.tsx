import LoginGate from '@/components/LoginGate';
import UserAccount from '@/components/UserAccount';
import { currentUser, toSession } from '@/lib/session';

export default async function AccountPage() {
  const user = await currentUser();
  // Один акаунт на людину: збережене бачить кожен залогінений — і покупець, і ріелтор
  if (!user) {
    return (
      <LoginGate
        role="user"
        title="Buyer account"
        text="Keep your shortlist, saved searches and contact details in one place while you plan the trip."
        signedInAs={null}
      />
    );
  }
  return <UserAccount
    session={toSession(user)}
    user={{ email: user.email, phone: user.phone }}
  />;
}
