import Link from 'next/link';
import Logo from './Logo';
import LangSwitch from './LangSwitch';
import { CONTACT_EMAIL, OPERATOR } from '@/lib/site';
import { getT, getLp } from '@/lib/i18n/server';

export default async function Footer() {
  const lp = await getLp();
  const t = await getT();
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div style={{ maxWidth: 280 }}>
          <Link className="logo" href={lp('/')}>
            <span className="logo__mark"><Logo size={28} /></span>
            <span>Resoha<span className="logo__sub"> Roatán</span></span>
          </Link>
          <p className="small" style={{ marginTop: 10 }}>
            {t('Property on Roatán and the Bay Islands. Every listing links back to the island agency that holds it.')}
          </p>
        </div>
        <div className="footer__cols">
          <div>
            <h4>{t('Property')}</h4>
            <ul>
              <li><Link href={lp('/listings?deal=sale')}>{t('Homes & condos for sale')}</Link></li>
              <li><Link href={lp('/listings?deal=rent')}>{t('Long-term rentals')}</Link></li>
              <li><Link href={lp('/listings?type=land')}>{t('Land & lots')}</Link></li>
              <li><Link href={lp('/listings?oceanfront=1')}>{t('Oceanfront')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('Buying on Roatán')}</h4>
            <ul>
              <li><Link href={lp('/guides')}>{t('Buying guides')}</Link></li>
              <li><Link href={lp('/areas')}>{t('Areas of Roatán')}</Link></li>
              <li><Link href={lp('/market')}>{t('Market report')}</Link></li>
              <li><Link href={lp('/land-passport')}>{t('Land passport')}</Link></li>
              <li><Link href={lp('/faq')}>{t('FAQ')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('Accounts')}</h4>
            <ul>
              <li><Link href="/account">{t('Buyer account')}</Link></li>
              <li><Link href="/agent">{t('Agent dashboard')}</Link></li>
              <li><Link href={lp('/for-agents')}>{t('List your properties')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>Resoha</h4>
            <ul>
              <li><Link href={lp('/about')}>{t('About Resoha')}</Link></li>
              <li><Link href="/privacy">{t('Privacy policy')}</Link></li>
              <li><Link href="/terms">{t('Terms of use')}</Link></li>
              {CONTACT_EMAIL && <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
            </ul>
          </div>
        </div>
      </div>
      <div className="wrap footer__bottom">
        <div className="tiny muted">
          © 2026 {OPERATOR}. {t('Resoha is a listing platform, not a broker — listing details are as published by the agency holding each property.')}
        </div>
        <LangSwitch />
      </div>
    </footer>
  );
}
