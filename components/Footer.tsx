import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div style={{ maxWidth: 280 }}>
          <Link className="logo" href="/">
            <span className="logo__mark">R</span>
            <span>Resoha<span className="logo__sub"> Roatán</span></span>
          </Link>
          <p className="small" style={{ marginTop: 10 }}>
            Property on Roatán and the Bay Islands. MVP prototype running on Supabase — listing data is fictional.
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
            <h4>API</h4>
            <ul>
              <li><a href="/api/listings">/api/listings</a></li>
              <li><a href="/api/agents">/api/agents</a></li>
              <li><a href="/api/auth/me">/api/auth/me</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="wrap tiny muted" style={{ marginTop: 26 }}>
        © 2026 Resoha — prototype. Listing data is fictional and for demo purposes only.
      </div>
    </footer>
  );
}
