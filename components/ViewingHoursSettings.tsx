'use client';
import { useEffect, useState } from 'react';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { WEEKDAYS, type WeekSchedule } from '@/lib/visits';
import { DEFAULT_VIEWING_SCHEDULE } from '@/lib/viewings';

type DayRow = { on: boolean; open: string; close: string };
const toRows = (w: WeekSchedule): DayRow[] => WEEKDAYS.map((_, i) => {
  const d = w[i];
  return d ? { on: true, ...d } : { on: false, open: '09:00', close: '17:00' };
});

/**
 * Години показів ріелтора (0069): у ці години покупці записуються на перегляд вторинки
 * прямо з картки оголошення. Без налаштувань — пн–сб 9:00–17:00; можна вимкнути зовсім.
 */
export default function ViewingHoursSettings() {
  const t = useT();
  const [week, setWeek] = useState<DayRow[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile/viewing-hours', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setWeek(toRows(d?.schedule ?? DEFAULT_VIEWING_SCHEDULE));
        setEnabled(d?.enabled !== false);
        setCustom(Boolean(d?.custom));
      })
      .catch(() => setWeek(toRows(DEFAULT_VIEWING_SCHEDULE)));
  }, []);

  if (!week) return null;
  const setDay = (i: number, v: Partial<DayRow>) => setWeek((w) => w!.map((d, j) => (j === i ? { ...d, ...v } : d)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const bad = week!.findIndex((d) => d.on && d.close <= d.open);
    if (bad >= 0) return toast(`${t(WEEKDAYS[bad])}: ${t('closing time must be after opening time')}`);
    // жодного робочого дня — це «вимкнути запис», а не «типові години»
    const on = enabled && week!.some((d) => d.on);
    setSaving(true);
    const res = await fetch('/api/profile/viewing-hours', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: on, schedule: week!.map((d) => (d.on ? { open: d.open, close: d.close } : null)) }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(t(d.error ?? 'Could not save'));
    setEnabled(d.enabled !== false);
    setCustom(Boolean(d.custom));
    toast(t('Viewing hours saved'));
  }

  return (
    <form className="panel" onSubmit={save} style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 6 }}>{t('Viewing hours')}</h3>
      <p className="small muted" style={{ margin: '0 0 14px' }}>
        {t('Buyers pick a free 30-minute slot for a viewing right on your resale listings. You get the booking as an enquiry and by email or Telegram; the buyer gets a calendar invite and reminders.')}
        {!custom && enabled && ` ${t('You have not set your own hours yet, so buyers see Mon–Sat 9:00–17:00.')}`}
      </p>
      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t('Let buyers book viewings online')}
      </label>
      {enabled && (
        <div className="sched">
          {week.map((d, i) => (
            <div key={WEEKDAYS[i]} className={`sched__row${d.on ? '' : ' is-off'}`}>
              <label className="sched__day">
                <input type="checkbox" checked={d.on} onChange={(e) => setDay(i, { on: e.target.checked })} /> {t(WEEKDAYS[i])}
              </label>
              {d.on ? (
                <span className="sched__time">
                  <input className="input" type="time" step={1800} value={d.open} required
                    onChange={(e) => setDay(i, { open: e.target.value })} aria-label={`${WEEKDAYS[i]} from`} />
                  –
                  <input className="input" type="time" step={1800} value={d.close} required
                    onChange={(e) => setDay(i, { close: e.target.value })} aria-label={`${WEEKDAYS[i]} to`} />
                </span>
              ) : <span className="small muted">{t('Closed')}</span>}
            </div>
          ))}
        </div>
      )}
      <p className="tiny muted" style={{ margin: '10px 0 14px' }}>
        {t('Honduras time. A slot you are already booked for, on any of your listings, disappears for other buyers.')}
      </p>
      <button className="btn btn--primary" disabled={saving}>{saving ? t('Saving…') : t('Save')}</button>
    </form>
  );
}
