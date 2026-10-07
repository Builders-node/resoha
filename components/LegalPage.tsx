import Link from 'next/link';
import { makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

/** Спільна обгортка для політики й умов: один стиль, одна дата, один контактний блок. */
export default async function LegalPage({ title, lead, children }: {
  title: string; lead: string; children: React.ReactNode;
}) {
  const lang = await getLang();
  const t = makeT(lang);
  return (
    <div className="wrap legal">
      <p className="tiny muted" style={{ marginBottom: 8 }}>{t('Last updated {date}', { date: t(LEGAL_UPDATED) })}</p>
      <h1>{t(title)}</h1>
      {/* Юридичний текст поки лише англійською */}
      {lang !== 'en' && <p className="small muted" lang={lang}>{t('This document is currently available in English only.')}</p>}
      <p className="legal__lead" lang="en">{lead}</p>
      <div lang="en">{children}</div>
      <section>
        <h2>{t('Contact')}</h2>
        <p>
          {t('Questions about this document, your account or your data:')}{' '}
          {CONTACT_EMAIL
            ? <a className="link-accent" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            : t('use the enquiry form on any listing and mention “Resoha support” — it reaches the platform team.')}
        </p>
        <p className="small muted">
          {t('See also:')} <Link className="link-accent" href="/privacy">{t('Privacy policy')}</Link> ·{' '}
          <Link className="link-accent" href="/terms">{t('Terms of use')}</Link>
        </p>
      </section>
    </div>
  );
}
