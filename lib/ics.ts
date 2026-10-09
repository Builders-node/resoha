/**
 * Календарний файл (.ics, RFC 5545) для візиту у відділ продажів: вкладення в лист,
 * кнопка «Add to calendar» після запису і на сторінці /visit/<token>.
 * Без залежностей від сервера — той самий код працює в браузері.
 */

export type CalEvent = {
  /** Стабільний ідентифікатор: той самий UID з більшим SEQUENCE календар вважає оновленням */
  uid: string;
  start: Date;
  minutes?: number;
  title: string;
  location?: string;
  description?: string;
  url?: string;
  sequence?: number;
};

/** Скільки триває візит у календарі (слот запису — пів години, але показ квартир довший) */
export const VISIT_MINUTES = 60;

/** 2026-10-09T10:00:00.000Z → 20261009T100000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

/** Рядки довші за 75 байт переносимо пробілом на початку наступного — так вимагає стандарт */
function fold(line: string) {
  const enc = new TextEncoder();
  let out = '', cur = '', len = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (len + n > 74) { out += `${cur}\r\n `; cur = ''; len = 1; }
    cur += ch; len += n;
  }
  return out + cur;
}

export function buildIcs(e: CalEvent, now = new Date()) {
  const end = new Date(e.start.getTime() + (e.minutes ?? VISIT_MINUTES) * 60_000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Resoha//Visits//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SEQUENCE:${Math.max(0, Math.floor(e.sequence ?? 0))}`,
    `SUMMARY:${escText(e.title)}`,
    e.location && `LOCATION:${escText(e.location)}`,
    e.description && `DESCRIPTION:${escText(e.description)}`,
    e.url && `URL:${e.url}`,
    'STATUS:CONFIRMED',
    // нагадування за годину до візиту
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText(e.title)}`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean) as string[];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Посилання «додати в Google Calendar» — для Android, де .ics не завжди є чим відкрити */
export function googleCalendarUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + (e.minutes ?? VISIT_MINUTES) * 60_000);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: e.title, dates: `${stamp(e.start)}/${stamp(end)}`,
    details: [e.description, e.url].filter(Boolean).join('\n\n'),
    location: e.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Подія візиту з того, що відомо про запис */
export function visitEvent(v: {
  uid: string; visitAt: string; place: string; address?: string; manageUrl?: string;
  agent?: { name?: string; phone?: string } | null; sequence?: number;
}): CalEvent {
  const contact = [v.agent?.name, v.agent?.phone].filter(Boolean).join(', ');
  return {
    uid: v.uid,
    start: new Date(v.visitAt),
    title: `Visit: ${v.place}`,
    location: v.address || v.place,
    description: [
      `Sales office visit at ${v.place}.`,
      contact && `Contact: ${contact}`,
      v.manageUrl && `Change or cancel: ${v.manageUrl}`,
    ].filter(Boolean).join('\n'),
    url: v.manageUrl,
    sequence: v.sequence,
  };
}

/** UID для запису за id заявки: однаковий у листі й на сторінці /visit/<token> */
export const visitUid = (leadId: string) => `visit-${leadId}@resoha`;

/** SEQUENCE, що лише росте: хвилини від 2026 року — новіший файл перекриває старіший */
export const seqNow = (now = Date.now()) => Math.max(0, Math.floor((now - Date.UTC(2026, 0, 1)) / 60_000));

/** data:-посилання на .ics — для кнопки в браузері, коли сервер не знає токена */
export const icsDataUrl = (ics: string) => `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
