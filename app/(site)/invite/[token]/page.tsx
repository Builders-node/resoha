import type { Metadata } from 'next';
import Icon from '@/components/Icon';
import InviteAccept from '@/components/InviteAccept';
import { currentUser } from '@/lib/session';
import { inviteInfo } from '@/lib/team';

export const metadata: Metadata = { title: 'Agency invitation', robots: { index: false } };

/** Запрошення в агенцію за посиланням із листа. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [info, user] = await Promise.all([inviteInfo(token), currentUser()]);
  return (
    <div className="wrap" style={{ padding: '72px 0', textAlign: 'center', maxWidth: 560 }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="users" size={46} /></div>
      {info ? (
        <InviteAccept token={token} info={info}
          me={user ? { role: user.role, email: user.email, inAgency: user.agencyId === info.agency.id } : null} />
      ) : (
        <>
          <h1 style={{ marginTop: 12 }}>Invitation not found</h1>
          <p className="muted" style={{ margin: '10px 0 24px' }}>The link may be incomplete or the invitation was withdrawn. Ask the agency for a new one.</p>
        </>
      )}
    </div>
  );
}
