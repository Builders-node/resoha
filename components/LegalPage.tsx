import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

/** Спільна обгортка для політики й умов: один стиль, одна дата, один контактний блок. */
export default function LegalPage({ title, lead, children }: {
  title: string; lead: string; children: React.ReactNode;
}) {
  return (
    <div className="wrap legal">
      <p className="tiny muted" style={{ marginBottom: 8 }}>Last updated {LEGAL_UPDATED}</p>
      <h1>{title}</h1>
      <p className="legal__lead">{lead}</p>
      {children}
      <section>
        <h2>Contact</h2>
        <p>
          Questions about this document, your account or your data:{' '}
          {CONTACT_EMAIL
            ? <a className="link-accent" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            : <>use the enquiry form on any listing and mention “Resoha support” — it reaches the platform team.</>}
        </p>
        <p className="small muted">
          See also: <Link className="link-accent" href="/privacy">Privacy policy</Link> ·{' '}
          <Link className="link-accent" href="/terms">Terms of use</Link>
        </p>
      </section>
    </div>
  );
}
