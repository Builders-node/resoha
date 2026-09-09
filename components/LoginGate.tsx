import Link from 'next/link';
import Icon from './Icon';
import type { Role } from '@/lib/types';

type Props = {
  role: Role;
  title: string;
  text: string;
  /** Хтось уже залогінений, але не тією роллю — пропонувати «Sign in» безглуздо. */
  signedInAs?: string | null;
};

/** Екран для незалогінених — і для тих, хто зайшов не тією роллю. */
export default function LoginGate({ role, title, text, signedInAs }: Props) {
  const wantsAgent = role === 'agent';
  const signupAs = wantsAgent ? 'agent' : 'buyer';

  return (
    <div className="wrap" style={{ padding: '80px 0' }}>
      <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div className="empty__ico"><Icon name={wantsAgent ? 'building' : 'search'} size={40} /></div>
        <h2 style={{ marginTop: 10 }}>{title}</h2>

        <p className="muted" style={{ margin: '10px 0 22px' }}>
          {signedInAs ? (
            <>
              You are signed in as <b>{signedInAs}</b>, and this area is for{' '}
              {wantsAgent ? 'realtor accounts' : 'buyer accounts'}.{' '}
              {wantsAgent
                ? 'Register a realtor account to publish listings — this one stays for browsing.'
                : 'Your realtor account has its own dashboard.'}
            </>
          ) : text}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {signedInAs && !wantsAgent ? (
            <Link className="btn btn--primary btn--lg btn--block" href="/agent">Open the agent dashboard</Link>
          ) : (
            <>
              {!signedInAs && <Link className="btn btn--primary btn--lg btn--block" href="/login">Sign in</Link>}
              <Link className={`btn btn--lg btn--block ${signedInAs ? 'btn--primary' : 'btn--ghost'}`}
                href={`/signup?as=${signupAs}`}>
                Create {wantsAgent ? 'a realtor' : 'a buyer'} account
              </Link>
            </>
          )}

          {wantsAgent && (
            <Link className="link-accent" href="/signup?as=agency" style={{ justifyContent: 'center', marginTop: 4 }}>
              Register a whole agency <Icon name="arrowRight" size={15} />
            </Link>
          )}
          {signedInAs && (
            <Link className="btn btn--ghost btn--block" href="/agents">Browse agents &amp; agencies</Link>
          )}
        </div>
      </div>
    </div>
  );
}
