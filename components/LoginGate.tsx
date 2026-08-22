import Link from 'next/link';
import Icon from './Icon';
import type { Role } from '@/lib/types';

/** Екран для незалогінених: справжній вхід або реєстрація потрібної ролі. */
export default function LoginGate({ role, title, text }: { role: Role; title: string; text: string }) {
  const signupAs = role === 'agent' ? 'agent' : 'buyer';
  return (
    <div className="wrap" style={{ padding: '80px 0' }}>
      <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div className="empty__ico"><Icon name={role === 'agent' ? 'building' : 'search'} size={40} /></div>
        <h2 style={{ marginTop: 10 }}>{title}</h2>
        <p className="muted" style={{ margin: '10px 0 22px' }}>{text}</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link className="btn btn--primary btn--lg btn--block" href="/login">Sign in</Link>
          <Link className="btn btn--ghost btn--lg btn--block" href={`/signup?as=${signupAs}`}>
            Create {role === 'agent' ? 'a realtor' : 'a buyer'} account
          </Link>
          {role === 'agent' && (
            <Link className="link-accent" href="/signup?as=agency" style={{ justifyContent: 'center', marginTop: 4 }}>
              Register a whole agency <Icon name="arrowRight" size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
