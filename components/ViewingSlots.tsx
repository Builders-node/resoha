'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLang, useT } from './LangProvider';
import { intlLocale } from '@/lib/i18n';
import {
  BOOK_DAYS, NO_LIMITS, addDays, freeSlotsFor, officeTimeToDate, officeToday, type Availability, type WeekSchedule,
} from '@/lib/visits';

type Hours = Availability & { schedule: WeekSchedule; enabled: boolean };

/** Скільки днів зі слотами показуємо в стрічці: два тижні вперед вистачає, далі — «пізніше» */
const STRIP_DAYS = 10;

/**
 * Вибір часу перегляду вторинки (0069), як у ЖК, але компактно — прямо в картці ріелтора.
 * Години показів ріелтора й зайняті слоти беремо з /api/agents/<id>/availability.
 * onChange(ISO) — обраний момент, '' — без часу (звичайне повідомлення).
 */
export default function ViewingSlots({ agentId, value, onChange }: {
  agentId: string;
  value: string;
  onChange: (iso: string, label: string) => void;
}) {
  const t = useT();
  const locale = intlLocale(useLang());
  const [hours, setHours] = useState<Hours | null>(null);
  const [day, setDay] = useState('');
  const [more, setMore] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(`/api/agents/${agentId}/availability`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Hours | null) => { if (!off && d && Array.isArray(d.schedule)) setHours(d); })
      .catch(() => {});
    return () => { off = true; };
  }, [agentId]);

  const avail: Availability = hours ? { ...NO_LIMITS, busy: hours.busy ?? {} } : NO_LIMITS;
  const days = useMemo(() => {
    if (!hours?.enabled) return [];
    const today = officeToday();
    const out: { day: string; slots: string[] }[] = [];
    for (let i = 0; i <= BOOK_DAYS && out.length < (more ? STRIP_DAYS * 2 : STRIP_DAYS); i++) {
      const d = addDays(today, i);
      const slots = freeSlotsFor(hours.schedule, d, avail);
      if (slots.length) out.push({ day: d, slots });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, more]);

  if (!hours?.enabled || days.length === 0) return null;
  const picked = days.find((d) => d.day === day) ?? null;
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o })
    .format(new Date(`${d}T12:00:00Z`));
  const pick = (d: string, time: string) => {
    const iso = officeTimeToDate(d, time).toISOString();
    if (iso === value) return onChange('', '');
    onChange(iso, `${fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`);
  };

  return (
    <div className="vslots">
      <div className="vslots__head">
        <b>{t('Pick a viewing time')}</b>
        <span className="tiny muted">{t('Optional · Honduras time')}</span>
      </div>
      <div className="vslots__days" role="listbox" aria-label={t('Viewing day')}>
        {days.map((d) => (
          <button key={d.day} type="button" role="option" aria-selected={d.day === day}
            className={`vslots__day${d.day === day ? ' is-on' : ''}`}
            onClick={() => { setDay(d.day === day ? '' : d.day); if (value) onChange('', ''); }}>
            <span className="tiny">{fmt(d.day, { weekday: 'short' })}</span>
            <b>{fmt(d.day, { day: 'numeric' })}</b>
            <span className="tiny">{fmt(d.day, { month: 'short' })}</span>
          </button>
        ))}
        {!more && (
          <button type="button" className="vslots__day vslots__more" onClick={() => setMore(true)}>
            <span className="tiny">{t('Later')}</span>
          </button>
        )}
      </div>
      {picked && (
        <div className="vslots__times">
          {picked.slots.map((s) => {
            const on = officeTimeToDate(picked.day, s).toISOString() === value;
            return (
              <button key={s} type="button" className={`cc__q${on ? ' is-on' : ''}`} aria-pressed={on}
                onClick={() => pick(picked.day, s)}>{s}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
