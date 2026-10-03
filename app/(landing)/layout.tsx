import Link from 'next/link';
import Logo from '@/components/Logo';
import Icon from '@/components/Icon';
import { CONTACT_EMAIL, OPERATOR } from '@/lib/site';

/**
 * Контентна частина (FAQ, гайди, райони, ринок, паспорт ділянки, про нас) живе без рейки каталогу: власна легка шапка з виходом у каталог
 * і короткий футер. Так сторінка читається як окремий сайт, а не як розділ кабінету.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp">
      <header className="lp-head">
        <div className="lp-wrap lp-head__in">
          <Link className="logo" href="/">
            <span className="logo__mark"><Logo size={28} /></span>
            <span>Resoha<span className="logo__sub"> Roatán</span></span>
          </Link>
          <nav className="lp-head__nav">
            <Link href="/guides">Guides</Link>
            <Link href="/areas">Areas</Link>
            <Link href="/market">Market</Link>
            <Link href="/land-passport">Land passport</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/for-agents">For agents</Link>
          </nav>
          <Link className="btn btn--orange" href="/listings?deal=sale" aria-label="Browse listings">
            <span className="lp-head__cta">Browse listings</span> <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot__in">
          <div>
            <Link className="logo" href="/">
              <span className="logo__mark"><Logo size={24} /></span>
              <span>Resoha<span className="logo__sub"> Roatán</span></span>
            </Link>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              © 2026 {OPERATOR}. A listing platform, not a broker.
            </p>
          </div>
          <nav className="lp-foot__nav small">
            <Link href="/">Catalogue</Link>
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
          </nav>
        </div>
      </footer>
    </div>
  );
}
