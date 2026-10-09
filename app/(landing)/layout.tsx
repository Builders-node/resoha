import Link from 'next/link';
import Logo from '@/components/Logo';
import Icon from '@/components/Icon';
import LangSwitch from '@/components/LangSwitch';
import CurrencySwitch from '@/components/CurrencySwitch';
import { getT, getLp } from '@/lib/i18n/server';
import { CONTACT_EMAIL, OPERATOR } from '@/lib/site';

/**
 * Контентна частина (FAQ, гайди, райони, ринок, паспорт ділянки, про нас) живе без рейки каталогу: власна легка шапка з виходом у каталог
 * і короткий футер. Так сторінка читається як окремий сайт, а не як розділ кабінету.
 */
export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const lp = await getLp();
  const t = await getT();
  return (
    <div className="lp">
      <header className="lp-head">
        <div className="lp-wrap lp-head__in">
          <Link className="logo" href={lp('/')}>
            <span className="logo__mark"><Logo size={28} /></span>
            <span>Resoha<span className="logo__sub"> Roatán</span></span>
          </Link>
          <nav className="lp-head__nav">
            <Link href={lp('/guides')}>{t('Guides')}</Link>
            <Link href={lp('/areas')}>{t('Areas')}</Link>
            <Link href={lp('/market')}>{t('Market')}</Link>
            <Link href={lp('/land-passport')}>{t('Land passport')}</Link>
            <Link href={lp('/faq')}>{t('FAQ')}</Link>
            <Link href={lp('/for-agents')}>{t('For agents')}</Link>
          </nav>
          <Link className="btn btn--orange" href={lp('/listings?deal=sale')} aria-label={t('Browse listings')}>
            <span className="lp-head__cta">{t('Browse listings')}</span> <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot__in">
          <div>
            <Link className="logo" href={lp('/')}>
              <span className="logo__mark"><Logo size={24} /></span>
              <span>Resoha<span className="logo__sub"> Roatán</span></span>
            </Link>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              © 2026 {OPERATOR}. {t('A listing platform, not a broker.')}
            </p>
            <span className="prefs lp-foot__lang"><LangSwitch /><CurrencySwitch /></span>
          </div>
          <nav className="lp-foot__nav small">
            <Link href={lp('/')}>{t('Catalogue')}</Link>
            <Link href={lp('/about')}>{t('About')}</Link>
            <Link href="/privacy">{t('Privacy')}</Link>
            <Link href="/terms">{t('Terms')}</Link>
            {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
          </nav>
        </div>
      </footer>
    </div>
  );
}
