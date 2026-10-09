'use client';
import Icon from './Icon';
import { useT } from './LangProvider';
import { buildIcs, googleCalendarUrl, icsDataUrl, visitEvent } from '@/lib/ics';

/**
 * «Додати в календар»: файл .ics (Apple Calendar, Outlook, будь-який телефон) і посилання
 * на Google Calendar. Якщо є href — файл віддає сервер (/api/visit/<token>/ics), інакше
 * збираємо його тут же, у браузері.
 */
export default function AddToCalendar({ href, ...v }: Parameters<typeof visitEvent>[0] & { href?: string }) {
  const t = useT();
  const event = visitEvent(v);
  if (Number.isNaN(event.start.getTime())) return null;
  const file = href ?? icsDataUrl(buildIcs(event));
  return (
    <div className="addcal">
      <a className="btn btn--ghost btn--lg addcal__btn" href={file} download="visit.ics">
        <Icon name="calendar" size={18} /> {t('Add to calendar')}
      </a>
      <a className="addcal__link small" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
        {t('Google Calendar')}
      </a>
    </div>
  );
}
