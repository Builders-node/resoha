'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import Logo from './Logo';
import type { Session } from '@/lib/types';
import Avatar from './Avatar';
import AuthLink from './AuthLink';
import AccountSwitcher from './AccountSwitcher';
import LangSwitch from './LangSwitch';
import CurrencySwitch from './CurrencySwitch';
import { useT } from './LangProvider';

type Match = (path: string, deal: string, type: string) => boolean;

const NAV: { href: string; ico: string; cap: string; deskOnly?: boolean; match: Match }[] = [
  // «home» вже зайнятий продажем, тож головна їде під островом — і в ряду іконок її ні з чим не сплутати
  { href: '/', ico: 'island', cap: 'Home', match: (p) => p === '/' },
  { href: '/listings?deal=sale', ico: 'home', cap: 'Buy', match: (p, deal, type) => p === '/listings' && deal === 'sale' && type !== 'land' },
  { href: '/listings?deal=rent', ico: 'key', cap: 'Rent', match: (p, deal) => p === '/listings' && deal === 'rent' },
  // deskOnly — пункт лишається у вертикальній рейці, а на телефоні їде в лист «Other»
  { href: '/listings?type=land', ico: 'land', cap: 'Land', deskOnly: true, match: (p, _deal, type) => p === '/listings' && type === 'land' },
  { href: '/developments', ico: 'building', cap: 'New builds', deskOnly: true, match: (p) => p.startsWith('/developments') },
  // /saved показує збережене гостем у браузері, а залогіненого веде у вкладку кабінету
  { href: '/saved', ico: 'heart', cap: 'Saved', deskOnly: true, match: (p) => p === '/account' || p === '/saved' },
  { href: '/agents', ico: 'building', cap: 'Agents', deskOnly: true, match: (p) => p.startsWith('/agents') },
];

export default function Sidebar({ session }: { session: Session | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = useState(false);   // лист «Other» на телефоні
  const [menu, setMenu] = useState(false);   // меню «Me» на десктопі: акаунти й вихід
  const t = useT();
  const params = useSearchParams();
  const deal = params.get('deal') ?? '';
  const type = params.get('type') ?? '';

  // після переходу лист має закриватись сам
  useEffect(() => { setMore(false); setMenu(false); }, [pathname]);

  async function logout() {
    setMenu(false); setMore(false);
    // якщо в браузері відкладено інші акаунти, сервер одразу перемкне на наступний
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <aside className="sidebar">
        <Link className="sidebar__logo" href="/">
          <span className="sidebar__mark"><Logo size={40} /></span>
          <span className="sidebar__word">Resoha</span>
        </Link>

        {session?.isAdmin && (
          <Link href="/admin" className={`desk-only ${pathname === '/admin' ? 'is-active' : ''}`}>
            <span className="sidebar__ico"><Icon name="deed" size={22} /></span>
            <span className="sidebar__cap">{t('Admin')}</span>
          </Link>
        )}

        {NAV.map((n) => (
          <Link key={n.cap} href={n.href}
            className={`${n.match(pathname, deal, type) ? 'is-active' : ''} ${n.deskOnly ? 'desk-only' : ''}`}>
            <span className="sidebar__ico"><Icon name={n.ico} size={22} /></span>
            <span className="sidebar__cap">{t(n.cap)}</span>
          </Link>
        ))}

        <div className="sidebar__foot">
          {session ? (
            // «Me» відкриває меню: кабінет, інші акаунти браузера, вихід
            <button className="sidelink desk-only" onClick={() => setMenu(!menu)} aria-expanded={menu}>
              <Avatar className="sidebar__avatar" src={session.avatar} name={session.name} />
              <span className="sidebar__cap">{t('Me')}</span>
            </button>
          ) : (
            <AuthLink className="desk-only">
              <span className="sidebar__ico"><Icon name="user" size={22} /></span>
              <span className="sidebar__cap">{t('Sign in')}</span>
            </AuthLink>
          )}
          <button className="sidelink mob-only" onClick={() => setMore(true)}>
            <span className="sidebar__ico"><Icon name="more" size={22} /></span>
            <span className="sidebar__cap">{t('Other')}</span>
          </button>
        </div>
      </aside>

      {menu && session && (
        <div className="me-menu-wrap" onClick={(e) => e.target === e.currentTarget && setMenu(false)}>
          <div className="me-menu">
            <Link className="sheet__me" href={session.role === 'agent' ? '/agent' : '/account'} onClick={() => setMenu(false)}>
              <Avatar src={session.avatar} name={session.name} />
              <span>
                <b>{session.name}</b>
                <span className="muted small">
                  {t(session.role === 'agent' ? (session.isOwner ? 'Agency owner' : 'Realtor') : 'Buyer account')}
                </span>
              </span>
            </Link>
            <AccountSwitcher onDone={() => setMenu(false)} />
            <button className="sheet__item" onClick={logout}>
              <Icon name="logout" size={19} /> {t('Sign out')}
            </button>
          </div>
        </div>
      )}

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
                    {t(session.role === 'agent' ? (session.isOwner ? 'Agency owner' : 'Realtor') : 'Buyer account')}
                  </span>
                </span>
              </Link>
            )}
            {session && <AccountSwitcher onDone={() => setMore(false)} />}

            <Link className="sheet__item" href="/saved">
              <Icon name="heart" size={19} /> {t('Saved listings')}
            </Link>

            <Link className="sheet__item" href="/agents">
              <Icon name="building" size={19} /> {t('Agents & agencies')}
            </Link>

            <Link className="sheet__item" href="/developments">
              <Icon name="building" size={19} /> {t('New developments')}
            </Link>
            <Link className="sheet__item" href="/listings?type=land">
              <Icon name="land" size={19} /> {t('Land & lots')}
            </Link>

            {session?.isAdmin && (
              <Link className="sheet__item" href="/admin">
                <Icon name="deed" size={19} /> {t('Admin panel')}
              </Link>
            )}

            {session ? (
              <button className="sheet__item" onClick={logout}>
                <Icon name="logout" size={19} /> {t('Sign out')}
              </button>
            ) : (
              <>
                <AuthLink className="sheet__item" onOpen={() => setMore(false)}><Icon name="user" size={19} /> {t('Sign in')}</AuthLink>
                <AuthLink className="sheet__item" view="signup" onOpen={() => setMore(false)}><Icon name="plus" size={19} /> {t('Create an account')}</AuthLink>
              </>
            )}

            {/* футер на телефоні схований — правові сторінки мають бути досяжні звідси */}
            <div className="prefs" style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><LangSwitch /><CurrencySwitch /></div>
            <p className="tiny muted" style={{ textAlign: 'center', margin: '6px 0 10px' }}>
              <Link href="/privacy">{t('Privacy')}</Link> · <Link href="/terms">{t('Terms')}</Link>
            </p>
            <button className="btn btn--ghost btn--block" onClick={() => setMore(false)}>{t('Close')}</button>
          </div>
        </div>
      )}

    </>
  );
}
