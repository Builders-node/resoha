'use client';
import Link from 'next/link';
import Icon from './Icon';
import { useT } from './LangProvider';
import { WhatsAppMark } from './AgentContact';

/**
 * Панель звʼязку внизу екрана на телефоні: WhatsApp, дзвінок, запис на перегляд.
 * Ті самі дії, що й у картці агента (AgentContact), — вона ж і передає обробники.
 * На широкому екрані схована: там картка агента й так липне збоку.
 */
export default function StickyContactBar({ waHref, telHref, visitHref, onWhatsApp, onCall, onBook }: {
  waHref: string; telHref: string; visitHref?: string;
  onWhatsApp: () => void; onCall: () => void; onBook: () => void;
}) {
  const t = useT();
  return (
    <div className="mbar no-print" role="region" aria-label={t('Contact the agent')}>
      {waHref && (
        <a className="mbar__btn mbar__btn--wa" href={waHref} target="_blank" rel="noreferrer" onClick={onWhatsApp}>
          <WhatsAppMark /> <span>WhatsApp</span>
        </a>
      )}
      {telHref && (
        <a className="mbar__btn" href={telHref} onClick={onCall}>
          <Icon name="phone" size={20} /> <span>{t('Call')}</span>
        </a>
      )}
      {visitHref ? (
        <Link className="mbar__btn mbar__btn--main" href={visitHref}>
          <Icon name="calendar" size={20} /> <span>{t('Book a visit')}</span>
        </Link>
      ) : (
        <button type="button" className="mbar__btn mbar__btn--main" onClick={onBook}>
          <Icon name="calendar" size={20} /> <span>{t('Book a viewing')}</span>
        </button>
      )}
    </div>
  );
}
