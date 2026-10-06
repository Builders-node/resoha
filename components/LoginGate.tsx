import Link from 'next/link';
import AuthLink from './AuthLink';
import Icon from './Icon';
import type { Role } from '@/lib/types';

type Props = {
  role: Role;
  title: string;
  text: string;
  /** Ріелтор у /account: пропонувати «Sign in» безглуздо. Покупця в /agent веде BecomeRealtor. */
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
              You are signed in as <b>{signedInAs}</b>, and this area is for buyer accounts.
              Your realtor account has its own dashboard.
            </>
          ) : text}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {signedInAs && !wantsAgent ? (
            <Link className="btn btn--primary btn--lg btn--block" href="/agent">Open the agent dashboard</Link>
          ) : (
            <>
              {!signedInAs && <AuthLink className="btn btn--primary btn--lg btn--block">Sign in</AuthLink>}
              <AuthLink className={`btn btn--lg btn--block ${signedInAs ? 'btn--primary' : 'btn--ghost'}`}
                view="signup" as={signupAs}>
                Create {wantsAgent ? 'a realtor' : 'a buyer'} account
              </AuthLink>
            </>
          )}

          {wantsAgent && (
            <AuthLink className="link-accent" view="signup" as="agency" style={{ justifyContent: 'center', marginTop: 4 }}>
              Register a whole agency <Icon name="arrowRight" size={15} />
            </AuthLink>
          )}
          {signedInAs && (
            <Link className="btn btn--ghost btn--block" href="/agents">Browse agents &amp; agencies</Link>
          )}
        </div>
      </div>
    </div>
  );
}
