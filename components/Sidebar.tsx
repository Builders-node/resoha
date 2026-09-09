'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import type { Session } from '@/lib/types';
import Avatar from './Avatar';

const NAV = [
  // «home» вже зайнятий продажем, тож головна їде під островом — і в ряду іконок її ні з чим не сплутати
  { href: '/', ico: 'island', cap: 'Home', match: (p: string) => p === '/' },
  { href: '/listings?deal=sale', ico: 'home', cap: 'Buy', match: (p: string, q: string) => p === '/listings' && q === 'sale' },
  { href: '/listings?deal=rent', ico: 'key', cap: 'Rent', match: (p: string, q: string) => p === '/listings' && q === 'rent' },
  // deskOnly — пункт лишається у вертикальній рейці, а на телефоні їде в лист «Other»
  { href: '/listings?type=land', ico: 'land', cap: 'Land', deskOnly: true, match: () => false },
  { href: '/account', ico: 'heart', cap: 'Saved', deskOnly: true, match: (p: string) => p === '/account' },
  { href: '/agent', ico: 'building', cap: 'Agents', deskOnly: true, match: (p: string) => p === '/agent' },
];

export default function Sidebar({ session }: { session: Session | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = useState(false);   // лист «Other» на телефоні
  const deal = useSearchParams().get('deal') ?? '';

  // після переходу лист має закриватись сам
  useEffect(() => { setMore(false); }, [pathname]);

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
          <Link href="/admin" className={`desk-only ${pathname === '/admin' ? 'is-active' : ''}`}>
            <span className="sidebar__ico"><Icon name="deed" size={22} /></span>
            <span className="sidebar__cap">Admin</span>
          </Link>
        )}

        {NAV.map((n) => (
          <Link key={n.cap} href={n.href}
            className={`${n.match(pathname, deal) ? 'is-active' : ''} ${n.deskOnly ? 'desk-only' : ''}`}>
            <span className="sidebar__ico"><Icon name={n.ico} size={22} /></span>
            <span className="sidebar__cap">{n.cap}</span>
          </Link>
        ))}

        <div className="sidebar__foot">
          {session ? (
            <>
              <Link className="desk-only" href={session.role === 'agent' ? '/agent' : '/account'}>
                <Avatar className="sidebar__avatar" src={session.avatar} name={session.name} />
                <span className="sidebar__cap">Me</span>
              </Link>
              <button className="sidelink desk-only" onClick={logout}>
                <span className="sidebar__ico"><Icon name="logout" size={22} /></span>
                <span className="sidebar__cap">Out</span>
              </button>
            </>
          ) : (
            <Link className="desk-only" href="/login">
              <span className="sidebar__ico"><Icon name="user" size={22} /></span>
              <span className="sidebar__cap">Sign in</span>
            </Link>
          )}
          <button className="sidelink mob-only" onClick={() => setMore(true)}>
            <span className="sidebar__ico"><Icon name="more" size={22} /></span>
            <span className="sidebar__cap">Other</span>
          </button>
        </div>
      </aside>

      {more && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="sheet">
            <span className="sheet__grip" />
            {session && (
              <Link className="sheet__me" href={session.role === 'agent' ? '/agent' : '/account'}>
                <Avatar src={session.avatar} name={session.name} />
                <span>
                  <b>{session.name}</b>
                  <span className="muted small">
                    {session.role === 'agent' ? (session.isOwner ? 'Agency owner' : 'Realtor') : 'Buyer account'}
                  </span>
                </span>
              </Link>
            )}

            <Link className="sheet__item" href="/account">
              <Icon name="heart" size={19} /> Saved listings
            </Link>

            <Link className="sheet__item" href="/agent">
              <Icon name="building" size={19} /> Agents &amp; agencies
            </Link>

            <Link className="sheet__item" href="/listings?type=land">
              <Icon name="land" size={19} /> Land &amp; lots
            </Link>

            {session?.isAdmin && (
              <Link className="sheet__item" href="/admin">
                <Icon name="deed" size={19} /> Admin panel
              </Link>
            )}

            {session ? (
              <button className="sheet__item" onClick={logout}>
                <Icon name="logout" size={19} /> Sign out
              </button>
            ) : (
              <>
                <Link className="sheet__item" href="/login"><Icon name="user" size={19} /> Sign in</Link>
                <Link className="sheet__item" href="/signup"><Icon name="plus" size={19} /> Create an account</Link>
              </>
            )}

            <button className="btn btn--ghost btn--block" onClick={() => setMore(false)}>Close</button>
          </div>
        </div>
      )}

    </>
  );
}
