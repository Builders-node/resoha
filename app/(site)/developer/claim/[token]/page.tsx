import type { Metadata } from 'next';
import Icon from '@/components/Icon';
import HandoverAccept from '@/components/HandoverAccept';
import { currentUser } from '@/lib/session';
import { handoverInfo } from '@/lib/developerHandover';

export const metadata: Metadata = { title: 'Developer profile handover', robots: { index: false } };

/** Посилання, за яким представник компанії забирає собі профіль забудовника. */
export default async function DeveloperClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [info, user] = await Promise.all([handoverInfo(token), currentUser()]);
  return (
    <div className="wrap" style={{ padding: '72px 0', textAlign: 'center', maxWidth: 560 }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="verified" size={46} /></div>
      {info ? (
        <HandoverAccept token={token} info={info} signedIn={!!user} />
      ) : (
        <>
          <h1 style={{ marginTop: 12 }}>Link not found</h1>
          <p className="muted" style={{ margin: '10px 0 24px' }}>The link may be incomplete or was replaced by a newer one. Ask for a new link.</p>
        </>
      )}
    </div>
  );
}
