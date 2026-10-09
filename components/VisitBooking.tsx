'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { toast } from './Toaster';
import { useLang, useT } from './LangProvider';
import { intlLocale } from '@/lib/i18n';
import {
  BOOK_DAYS, CONTACT_PREFS, NO_LIMITS, SALES_TZ, VISIT_TOPICS, WEEKDAYS, addDays, freeSlotsFor, officeTimeToDate, officeToday,
  scheduleLines, slotPart, weekdayOf, type Availability, type WeekSchedule,
} from '@/lib/visits';

/**
 * Свята й зайняті слоти ЖК (0055): спершу те, що прийшло зі сторінки, потім свіжі дані з API.
 * Без devId або до міграції — лише графік, як раніше.
 */
export function useAvailability(devId: string | undefined, initial?: Partial<Availability>) {
  const [avail, setAvail] = useState<Availability>({ ...NO_LIMITS, ...initial });
  const reload = useCallback(() => {
    if (!devId) return;
    fetch(`/api/developments/${devId}/availability`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Availability | null) => { if (d && d.busy) setAvail(d); })
      .catch(() => {});
  }, [devId]);
  useEffect(() => { reload(); }, [reload]);
  return [avail, reload] as const;
}

const STEPS = 4;
const PARTS = ['Morning', 'Afternoon', 'Evening'] as const;

/**
 * Запис на візит у відділ продажів, як у LUN: 1) що цікавить, 2) дата й час за графіком офісу,
 * 3) як звʼязатись; після відправки — підтвердження. Заявка падає в Leads кабінету ріелтора.
 */
export default function VisitBooking({ devId, devName, address, schedule, blackout, note, unitTopics, me, backHref, initialDay }: {
  devId: string;
  /** Свята відділу продажів — щоб календар не мигав до відповіді API */
  blackout?: string[];
  devName: string;
  address: string;
  schedule: WeekSchedule;
  note: string;
  /** «Studio», «2 BR»… — з квартир ЖК, ідуть у кінці списку тем */
  unitTopics: string[];
  me: { name: string; phone: string; email: string } | null;
  backHref: string;
  /** День, обраний у календарі на вкладці «Contacts» (?day=), — якщо в нього є вільний час */
  initialDay?: string;
}) {
  const t = useT();
  const locale = intlLocale(useLang());
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);
  const [avail, reloadAvail] = useAvailability(devId, { blackout: blackout ?? [] });
  const openSlots = (d: string) => freeSlotsFor(schedule, d, avail);
  const [day, setDay] = useState(() => (initialDay && freeSlotsFor(schedule, initialDay, { ...NO_LIMITS, blackout: blackout ?? [] }).length ? initialDay : ''));
  const [time, setTime] = useState('');
  const [sending, setSending] = useState(false);

  // коли форма зʼявилась: сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  const today = officeToday();
  const [month, setMonth] = useState((day || today).slice(0, 7));
  const slots = useMemo(() => (day ? freeSlotsFor(schedule, day, avail) : []), [schedule, day, avail]);

  // перший день з вільними слотами — щоб календар не відкривався на порожньому сьогодні
  function toDates() {
    if (!day) {
      for (let i = 0; i <= BOOK_DAYS; i++) {
        const d = addDays(today, i);
        if (openSlots(d).length) { setDay(d); setMonth(d.slice(0, 7)); break; }
      }
    }
    setStep(1);
  }

  const toggle = (x: string) => setTopics((v) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x]));
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o })
    .format(new Date(`${d}T12:00:00Z`));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    const res = await fetch(`/api/developments/${devId}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitAt: officeTimeToDate(day, time).toISOString(),
        interests: topics,
        name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
        contactVia: fd.get('contactVia'), message: fd.get('message'),
        website: fd.get('website'), ts: shownAt.current,
      }),
    });
    setSending(false);
    if (res.ok) return setStep(3);
    const error = (await res.json().catch(() => ({}))).error;
    toast(error ? t(error) : t('Something went wrong'));
    // слот могли вже прибрати (минув час чи хтось зайняв останнє місце) — повертаємо на вибір часу
    if (res.status === 400 && /time/i.test(error ?? '')) { setTime(''); setStep(1); reloadAvail(); }
  }

  const lines = scheduleLines(schedule);
  const dayName = (d: string) => d.split(' – ').map((x) => t(x)).join(' – ');

  return (
    <div className="visit">
      <h1 className="visit__title">{t('Book a visit')}</h1>
      <ol className="visit__dots" aria-label={t('Step {n} of {total}', { n: step + 1, total: STEPS })}>
        {Array.from({ length: STEPS }, (_, i) => (
          <li key={i} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />
        ))}
      </ol>

      {step === 0 && (
        <>
          <div className="visit__office">
            <div className="visit__office-head">
              <b>{t('{name} sales office', { name: devName })}</b>
              <span className="sales__ico"><Icon name="headset" size={26} /></span>
            </div>
            {address && <p><Icon name="pin" size={20} /> {address}</p>}
            {lines.length > 0 && (
              <div className="visit__office-hours">
                <Icon name="clock" size={20} />
                <dl className="sales__week">
                  {lines.map((l) => (
                    <div key={l.days}><dt>{dayName(l.days)}</dt><dd>{l.hours === 'Closed' ? t('Closed') : l.hours}</dd></div>
                  ))}
                </dl>
              </div>
            )}
            {note && <p className="small muted">{note}</p>}
          </div>

          <h2 className="visit__h">{t('What are you interested in at {name}?', { name: devName })}</h2>
          <div className="visit__chips">
            {[...VISIT_TOPICS, ...unitTopics].map((x) => (
              <button key={x} type="button" className={`chip-btn${topics.includes(x) ? ' is-on' : ''}`}
                aria-pressed={topics.includes(x)} onClick={() => toggle(x)}>{t(x)}</button>
            ))}
          </div>
          <button type="button" className="btn btn--primary btn--lg btn--block visit__next" onClick={toDates}>
            {t('Next')}
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="visit__h">{t('Pick a date and time that suits you')}</h2>
          <p className="small" style={{ margin: '-6px 0 20px' }}>
            {t('Times are shown in the sales office time zone ({tz})', { tz: SALES_TZ })}
          </p>
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
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(0)}>{t('Back')}</button>
            <button type="button" className="btn btn--primary btn--lg" disabled={!day || !time} onClick={() => setStep(2)}>
              {t('Next')}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="visit__form">
          <h2 className="visit__h">{t('How can we reach you?')}</h2>
          <p className="visit__picked small">
            <Icon name="calendar" size={18} /> {fmt(day, { weekday: 'long', month: 'long', day: 'numeric' })} · {time}
            <button type="button" className="visit__change" onClick={() => setStep(1)}>{t('Change')}</button>
          </p>
          <input className="input" name="name" placeholder={`${t('Your name')} *`} defaultValue={me?.name ?? ''} required maxLength={120} />
          <input className="input" name="email" type="email" placeholder="Email *" defaultValue={me?.email ?? ''} required maxLength={200} />
          <input className="input" name="phone" type="tel" placeholder={`${t('Phone / WhatsApp')} *`} defaultValue={me?.phone ?? ''} required maxLength={40} />
          <label className="visit__field">
            <span className="tiny muted">{t('Preferred contact')}</span>
            <select className="input" name="contactVia" defaultValue="phone">
              {CONTACT_PREFS.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
            </select>
          </label>
          <textarea className="input" name="message" rows={4} placeholder={t('Additional comment')} maxLength={1200} />
          {/* приманка для ботів: людина цього поля не бачить і не заповнює */}
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className="visit__nav">
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(1)}>{t('Back')}</button>
            <button className="btn btn--primary btn--lg" disabled={sending}>{sending ? t('Sending…') : t('Send')}</button>
          </div>
          <span className="tiny muted" style={{ textAlign: 'center' }}>
            {t('By sending you agree to be contacted about this property.')}{' '}
            <Link href="/privacy">{t('Privacy policy')}</Link>
          </span>
        </form>
      )}

      {step === 3 && (
        <div className="visit__done">
          <span className="visit__done-ico"><Icon name="check" size={34} strokeWidth={2.4} /></span>
          <h2 className="visit__h">{t('You are booked in')}</h2>
          <p><b>{fmt(day, { weekday: 'long', month: 'long', day: 'numeric' })} · {time}</b></p>
          {address && <p className="muted">{address}</p>}
          <p className="muted small">{t('The sales office will contact you to confirm the visit.')}</p>
          <Link className="btn btn--primary btn--lg" href={backHref}>{t('Back to {name}', { name: devName })}</Link>
        </div>
      )}
    </div>
  );
}

/**
 * Блок «Запишіться на візит у відділ продажу» на вкладці «Contacts», як у LUN: календар місяця
 * з робочими днями за графіком і кнопка — далі вже повна форма запису з обраним днем.
 */
export function VisitPicker({ schedule, href, devId, blackout }: {
  schedule: WeekSchedule; href: string; devId?: string; blackout?: string[];
}) {
  const t = useT();
  const [avail] = useAvailability(devId, { blackout: blackout ?? [] });
  const locale = intlLocale(useLang());
  const today = officeToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState('');
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o })
    .format(new Date(`${d}T12:00:00Z`));
  return (
    <div className="vcal vpick">
      <Calendar month={month} setMonth={setMonth} today={today} selected={day} fmt={fmt} t={t} bare
        isOpen={(d) => freeSlotsFor(schedule, d, avail).length > 0} onPick={setDay} />
      <Link className="btn btn--primary btn--lg btn--block vpick__go" href={day ? `${href}?day=${day}` : href}>
        {t('Book a visit')}
      </Link>
    </div>
  );
}

export function Calendar({ month, setMonth, today, selected, isOpen, onPick, fmt, t, bare }: {
  /** Без власного фону — коли календар уже всередині картки */
  bare?: boolean;
  month: string; setMonth: (m: string) => void; today: string; selected: string;
  isOpen: (d: string) => boolean; onPick: (d: string) => void;
  fmt: (d: string, o: Intl.DateTimeFormatOptions) => string;
  t: (s: string) => string;
}) {
  const first = `${month}-01`;
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells = [
    ...Array<string>(weekdayOf(first)).fill(''),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  const shift = (n: number) => addDays(first, n * 32).slice(0, 7);
  const last = addDays(today, BOOK_DAYS).slice(0, 7);

  return (
    <div className={bare ? undefined : 'vcal'}>
      <div className="vcal__head">
        <button type="button" className="vcal__nav" disabled={month <= today.slice(0, 7)}
          onClick={() => setMonth(addDays(first, -1).slice(0, 7))} aria-label={t('Previous month')}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <b>{fmt(first, { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="vcal__nav" disabled={month >= last}
          onClick={() => setMonth(shift(1))} aria-label={t('Next month')}>
          <Icon name="arrowRight" size={18} />
        </button>
      </div>
      <div className="vcal__grid">
        {WEEKDAYS.map((w) => <span key={w} className="vcal__wd">{t(w)}</span>)}
        {cells.map((d, i) => d ? (
          <button key={d} type="button" disabled={!isOpen(d)} onClick={() => onPick(d)}
            className={`vcal__day${d === selected ? ' is-on' : ''}${d === today ? ' is-today' : ''}`}
            aria-pressed={d === selected} aria-label={fmt(d, { weekday: 'long', month: 'long', day: 'numeric' })}>
            {Number(d.slice(8))}
          </button>
        ) : <span key={`e${i}`} />)}
      </div>
    </div>
  );
}
