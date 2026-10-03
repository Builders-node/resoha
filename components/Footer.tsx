import Link from 'next/link';
import Logo from './Logo';
import { CONTACT_EMAIL, OPERATOR } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div style={{ maxWidth: 280 }}>
          <Link className="logo" href="/">
            <span className="logo__mark"><Logo size={28} /></span>
            <span>Resoha<span className="logo__sub"> Roatán</span></span>
          </Link>
          <p className="small" style={{ marginTop: 10 }}>
            Property on Roatán and the Bay Islands. Every listing links back to the island agency that holds it.
          </p>
        </div>
        <div className="footer__cols">
          <div>
            <h4>Property</h4>
            <ul>
              <li><Link href="/listings?deal=sale">Homes &amp; condos for sale</Link></li>
              <li><Link href="/listings?deal=rent">Long-term rentals</Link></li>
              <li><Link href="/listings?type=land">Land &amp; lots</Link></li>
              <li><Link href="/listings?oceanfront=1">Oceanfront</Link></li>
            </ul>
          </div>
          <div>
            <h4>Accounts</h4>
            <ul>
              <li><Link href="/account">Buyer account</Link></li>
              <li><Link href="/agent">Agent dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4>Resoha</h4>
            <ul>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of use</Link></li>
              {CONTACT_EMAIL && <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
            </ul>
          </div>
        </div>
      </div>
      <div className="wrap tiny muted" style={{ marginTop: 26 }}>
        © 2026 {OPERATOR}. Resoha is a listing platform, not a broker — listing details are as published by the
        agency holding each property.
      </div>
    </footer>
  );
}
