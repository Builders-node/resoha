'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { toast } from './Toaster';
import { useLang, useT } from './LangProvider';
import { Calendar, useAvailability } from './VisitBooking';
import { intlLocale } from '@/lib/i18n';
import type { VisitCard } from '@/lib/visitBookings';
import {
  BOOK_DAYS, SALES_TZ, addDays, fmtVisit, freeSlotsFor, officeDayOf, officeTimeToDate, officeToday, slotKey, slotPart,
} from '@/lib/visits';

const PARTS = ['Morning', 'Afternoon', 'Evening'] as const;

const STATUS_TEXT: Record<VisitCard['status'], string> = {
  booked: 'Your visit is booked',
  cancelled: 'This visit is cancelled',
  attended: 'Thank you for visiting',
  no_show: 'This visit has passed',
};

/**
 * Покупець за посиланням із листа переносить або скасовує візит у відділ продажів.
 * Вільний час рахується так само, як при записі: графік, свята й місткість слота.
 */
export default function VisitManage({ token, initial }: { token: string; initial: VisitCard }) {
  const t = useT();
  const locale = intlLocale(useLang());
  const [visit, setVisit] = useState(initial);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  // момент відкриття сторінки: чи візит ще попереду
  const [now] = useState(() => Date.now());
  const dev = visit.development;
  const [avail, reloadAvail] = useAvailability(dev?.id, {
    blackout: dev?.blackout ?? [], capacity: dev?.capacity ?? 1,
  });

  const today = officeToday();
  const current = slotKey(visit.visitAt);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [month, setMonth] = useState(today.slice(0, 7));
  const schedule = dev?.schedule ?? [];
  // свій нинішній слот не рахуємо зайнятим — але й обирати його вдруге немає сенсу
  const openSlots = (d: string) => freeSlotsFor(schedule, d, avail).filter((s) => slotKey(officeTimeToDate(d, s)) !== current);
  const slots = day ? openSlots(day) : [];

  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o })
    .format(new Date(`${d}T12:00:00Z`));
  const upcoming = visit.status === 'booked' && Date.parse(visit.visitAt) > now;
  const place = dev?.name || visit.listing.title;
  const address = dev ? dev.office || [dev.address, dev.neighborhood].filter(Boolean).join(', ') : '';

  function startMove() {
    // перший день із вільним часом
    for (let i = 0; i <= BOOK_DAYS; i++) {
      const d = addDays(today, i);
      if (openSlots(d).length) { setDay(d); setMonth(d.slice(0, 7)); break; }
    }
    setTime('');
    setMoving(true);
  }

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true);
    const res = await fetch(`/api/visit/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast(d.error ? t(d.error) : t('Something went wrong'));
      if (/time/i.test(d.error ?? '')) { setTime(''); reloadAvail(); }
      return;
    }
    if (d.visit) setVisit(d.visit);
    setMoving(false);
    reloadAvail();
    toast(t(done));
  }

  function cancel() {
    if (!confirm(t('Cancel your visit to {name}?', { name: place }))) return;
    send({ action: 'cancel' }, 'Your visit is cancelled');
  }

  return (
    <div className="visit vmanage">
      <h1 className="visit__title">{t(STATUS_TEXT[visit.status])}</h1>

      <div className="visit__office">
        <div className="visit__office-head">
          <b>{t('{name} sales office', { name: place })}</b>
          <span className="sales__ico"><Icon name="calendar" size={26} /></span>
        </div>
        <p className={visit.status === 'cancelled' ? 'vmanage__when is-off' : 'vmanage__when'}>
          <Icon name="clock" size={20} /> {fmtVisit(visit.visitAt, locale)}
          <span className="tiny muted"> · {t('Times are shown in the sales office time zone ({tz})', { tz: SALES_TZ })}</span>
        </p>
        {address && <p><Icon name="pin" size={20} /> {address}</p>}
        {visit.agent?.name && (
          <p><Icon name="user" size={20} /> {visit.agent.name}
            {visit.agent.phone && <> · <a href={`tel:${visit.agent.phone.replace(/[^+\d]/g, '')}`}>{visit.agent.phone}</a></>}
          </p>
        )}
        {visit.status === 'cancelled' && (
          <p className="small muted">
            {visit.cancelledBy === 'team'
              ? t('The sales office cancelled this visit. They will contact you to agree on another time.')
              : t('You cancelled this visit.')}
          </p>
        )}
      </div>

      {upcoming && !moving && (
        <div className="visit__nav">
          <button type="button" className="btn btn--ghost btn--lg" disabled={busy} onClick={cancel}>{t('Cancel visit')}</button>
          <button type="button" className="btn btn--primary btn--lg" disabled={busy || !schedule.length} onClick={startMove}>
            {t('Reschedule')}
          </button>
        </div>
      )}

      {upcoming && moving && (
        <>
          <h2 className="visit__h">{t('Pick a new date and time')}</h2>
          <Calendar month={month} setMonth={setMonth} today={today} selected={day} fmt={fmt} t={t}
            isOpen={(d) => openSlots(d).length > 0} onPick={(d) => { setDay(d); setTime(''); }} />
          {day && slots.length === 0 && <p className="muted" style={{ marginTop: 24 }}>{t('No free times on this day.')}</p>}
          {PARTS.map((part) => {
            const list = slots.filter((s) => slotPart(s) === part);
            return list.length > 0 && (
              <div key={part} className="visit__part">
                <h3>{t(part)}</h3>
                <div className="visit__chips">
                  {list.map((s) => (
                    <button key={s} type="button" className={`chip-btn${time === s ? ' is-on' : ''}`}
                      aria-pressed={time === s} onClick={() => setTime(s)}>{s}</button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="visit__nav">
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setMoving(false)}>{t('Back')}</button>
            <button type="button" className="btn btn--primary btn--lg" disabled={busy || !day || !time}
              onClick={() => send({ action: 'reschedule', visitAt: officeTimeToDate(day, time).toISOString() }, 'Your visit is moved')}>
              {day && time ? t('Move to {when}', { when: `${fmt(day, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}` }) : t('Pick a time')}
            </button>
          </div>
        </>
      )}

      {!upcoming && dev?.slug && (
        <Link className="btn btn--primary btn--lg btn--block" href={`/developments/${dev.slug}/visit`}>{t('Book another visit')}</Link>
      )}
      {visit.status === 'booked' && !upcoming && officeDayOf(new Date(visit.visitAt)) === today && (
        <p className="small muted" style={{ marginTop: 16 }}>{t('This visit has already started and can no longer be changed online.')}</p>
      )}
    </div>
  );
}
