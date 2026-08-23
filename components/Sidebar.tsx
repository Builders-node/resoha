'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Icon from './Icon';
import type { Session } from '@/lib/types';

const NAV = [
  { href: '/listings?deal=sale', ico: 'home', cap: 'Buy', match: (p: string, q: string) => p === '/listings' && q === 'sale' },
  { href: '/listings?deal=rent', ico: 'key', cap: 'Rent', match: (p: string, q: string) => p === '/listings' && q === 'rent' },
  { href: '/listings?type=land', ico: 'land', cap: 'Land', match: () => false },
  { href: '/account', ico: 'heart', cap: 'Saved', match: (p: string) => p === '/account' },
  { href: '/agent', ico: 'building', cap: 'Agents', match: (p: string) => p === '/agent' },
];

export default function Sidebar({ session }: { session: Session | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const deal = useSearchParams().get('deal') ?? '';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <aside className="sidebar">
        <Link className="sidebar__logo" href="/">
          <span className="sidebar__mark">R</span>
          <span className="sidebar__word">Resoha</span>
        </Link>

        {session?.isAdmin && (
          <Link href="/admin" className={pathname === '/admin' ? 'is-active' : ''}>
            <span className="sidebar__ico"><Icon name="deed" size={22} /></span>
            <span className="sidebar__cap">Admin</span>
          </Link>
        )}

        {NAV.map((n) => (
          <Link key={n.cap} href={n.href} className={n.match(pathname, deal) ? 'is-active' : ''}>
            <span className="sidebar__ico"><Icon name={n.ico} size={22} /></span>
            <span className="sidebar__cap">{n.cap}</span>
          </Link>
        ))}

        <div className="sidebar__foot">
          {session ? (
            <>
              <Link href={session.role === 'agent' ? '/agent' : '/account'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="sidebar__avatar" src={session.avatar} alt={session.name} />
                <span className="sidebar__cap">Me</span>
              </Link>
              <button className="sidelink" onClick={logout}>
                <span className="sidebar__ico"><Icon name="logout" size={22} /></span>
                <span className="sidebar__cap">Out</span>
              </button>
            </>
          ) : (
            <Link href="/login">
              <span className="sidebar__ico"><Icon name="user" size={22} /></span>
              <span className="sidebar__cap">Sign in</span>
            </Link>
          )}
        </div>
      </aside>

    </>
  );
}
