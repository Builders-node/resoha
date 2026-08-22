import Link from 'next/link';
import Icon from '@/components/Icon';

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: '90px 0', textAlign: 'center' }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="island" size={46} /></div>
      <h1 style={{ marginTop: 12 }}>Page not found</h1>
      <p className="muted" style={{ margin: '10px 0 22px' }}>This listing may have been sold or taken down.</p>
      <Link className="btn btn--primary btn--lg" href="/listings">Browse listings</Link>
    </div>
  );
}
