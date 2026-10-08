import Link from 'next/link';
import AdminPanel from '@/components/AdminPanel';
import AuthLink from '@/components/AuthLink';
import Icon from '@/components/Icon';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Admin — Resoha Roatán' };

export default async function AdminPage() {
  const session = await getSession();

  if (!session?.isAdmin) {
    return (
      <div className="wrap" style={{ padding: '80px 0' }}>
        <div className="panel" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
          <div className="empty__ico"><Icon name="deed" size={40} /></div>
          <h2 style={{ marginTop: 10 }}>Admin area</h2>
          <p className="muted" style={{ margin: '10px 0 24px' }}>
            {session
              ? 'This account does not have platform admin rights.'
              : 'Sign in with an admin account to moderate listings, agencies and reviews.'}
          </p>
          {session
            ? <Link className="btn btn--primary btn--lg btn--block" href="/">Back to the site</Link>
            : <AuthLink className="btn btn--primary btn--lg btn--block">Sign in</AuthLink>}
        </div>
      </div>
    );
  }

  return <AdminPanel session={session} />;
}
