import Link from 'next/link';
import Logo from '@/components/Logo';
import Icon from '@/components/Icon';
import LangSwitch from '@/components/LangSwitch';
import CurrencySwitch from '@/components/CurrencySwitch';
import { getT, getLp } from '@/lib/i18n/server';
import { CONTACT_EMAIL, OPERATOR } from '@/lib/site';

/**
 * Контентна частина (FAQ, гайди, блог, райони, ринок, паспорт ділянки, про нас) живе без рейки каталогу:
 * власна легка шапка над теплим градієнтом, світлі великі заголовки, пастельні картки й чорний футер.
 * Так сторінка читається як окремий сайт-журнал, а не як розділ кабінету. Стилі — у блоці `.lp` globals.css.
 */
export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const lp = await getLp();
  const t = await getT();
  const nav: [string, string][] = [
    ['/guides', 'Guides'], ['/blog', 'Blog'], ['/areas', 'Areas'], ['/market', 'Market'],
    ['/land-passport', 'Land passport'], ['/faq', 'FAQ'], ['/for-agents', 'For agents'],
  ];
  return (
    <div className="lp">
      <header className="lp-head">
        <div className="lp-wrap lp-head__in">
          <Link className="logo" href={lp('/')}>
            <span className="logo__mark"><Logo size={28} /></span>
            <span>Hogarli</span>
          </Link>
          <nav className="lp-head__nav">
            {nav.map(([href, name]) => <Link key={href} href={lp(href)}>{t(name)}</Link>)}
          </nav>
          <Link className="btn btn--primary lp-head__btn" href={lp('/listings?deal=sale')} aria-label={t('Browse listings')}>
            <span className="lp-head__cta">{t('Browse listings')}</span> <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot__grid">
            <div className="lp-foot__brand">
              <Link className="logo" href={lp('/')}>
                <span className="logo__mark"><Logo size={26} /></span>
                <span>Hogarli</span>
              </Link>
              <p className="small">
                {t('Property in Honduras: Roatán and the Bay Islands, San Pedro Sula and Tegucigalpa. Every listing links back to the agency that holds it.')}
              </p>
            </div>
            <nav className="lp-foot__col small" aria-label={t('Learn')}>
              <b>{t('Learn')}</b>
              <Link href={lp('/guides')}>{t('Buying guides')}</Link>
              <Link href={lp('/blog')}>{t('Blog')}</Link>
              <Link href={lp('/areas')}>{t('Areas and cities')}</Link>
              <Link href={lp('/market')}>{t('Market report')}</Link>
              <Link href={lp('/faq')}>{t('FAQ')}</Link>
            </nav>
            <nav className="lp-foot__col small" aria-label={t('Property')}>
              <b>{t('Property')}</b>
              <Link href={lp('/listings?deal=sale')}>{t('Homes & condos for sale')}</Link>
              <Link href={lp('/listings?deal=rent')}>{t('Long-term rentals')}</Link>
              <Link href={lp('/listings?deal=sale&type=land')}>{t('Land & lots')}</Link>
              <Link href={lp('/developments')}>{t('New developments')}</Link>
              <Link href={lp('/land-passport')}>{t('Land passport')}</Link>
            </nav>
            <div className="lp-foot__card">
              <h3>{t('Find your place in Honduras')}</h3>
              <p className="small">{t('Search homes, condos, rentals and land on one map and contact the agent directly. Free for buyers.')}</p>
              <Link className="btn btn--block lp-foot__btn" href={lp('/listings?deal=sale')}>{t('Browse listings')} <Icon name="arrowRight" size={16} /></Link>
              <Link className="btn btn--block lp-foot__ghost" href={lp('/for-agents')}>{t('List your properties')}</Link>
            </div>
          </div>
          <div className="lp-foot__bottom tiny">
            <span>© 2026 {OPERATOR}. {t('A listing platform, not a broker.')}</span>
            <nav className="lp-foot__links">
              <Link href={lp('/about')}>{t('About')}</Link>
              <Link href="/privacy">{t('Privacy')}</Link>
              <Link href="/terms">{t('Terms')}</Link>
              {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
            </nav>
            <span className="prefs lp-foot__lang"><LangSwitch /><CurrencySwitch /></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
