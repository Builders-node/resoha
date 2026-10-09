'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import type { TeamVisit } from '@/lib/visitBookings';
import {
  SALES_TZ, VISIT_STATUS_LABEL, WEEKDAYS, addDays, contactPrefShort, officeDayOf, officeToday, weekdayOf, type VisitStatus,
} from '@/lib/visits';

const STATUS_PILL: Record<VisitStatus, string> = {
  booked: 'pill--info', attended: 'pill--on', no_show: 'pill--warn', cancelled: 'pill--off',
};

const timeOf = (iso: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: SALES_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(iso));
const dayTitle = (d: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
  .format(new Date(`${d}T12:00:00Z`));

/**
 * Календар візитів відділу продажів на тиждень: хто й коли прийде, на який ЖК, до кого.
 * Ріелтор бачить свої візити, роль «Leads only», менеджер і власник — усієї команди (RLS заявок).
 * Тут же відмітка «прийшов / не прийшов» і скасування (покупцю піде лист).
 */
export default function VisitsCalendar({ meId }: { meId: string }) {
  const today = officeToday();
  const [start, setStart] = useState(() => addDays(today, -weekdayOf(today)));
  const [items, setItems] = useState<TeamVisit[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  // «вже минув» рахуємо від моменту завантаження списку
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    fetch(`/api/visits?from=${start}&to=${addDays(start, 7)}`).then((r) => r.json()).catch(() => ({}))
      .then((d) => { setItems(d.items ?? []); setNow(Date.now()); });
  }, [start]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(v: TeamVisit, status: VisitStatus) {
    if (status === 'cancelled' && !confirm(`Cancel the visit of ${v.name}? ${v.email ? 'They get an email about it.' : ''}`)) return;
    const res = await fetch(`/api/visits/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? `Marked as ${VISIT_STATUS_LABEL[status].toLowerCase()}` : d.error ?? 'Not allowed');
    load();
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const visible = (items ?? []).filter((v) => showCancelled || v.status !== 'cancelled');
  const byDay = (d: string) => visible.filter((v) => officeDayOf(new Date(v.visitAt)) === d);
  const count = (s: VisitStatus) => (items ?? []).filter((v) => v.status === s && days.includes(officeDayOf(new Date(v.visitAt)))).length;
  const past = (v: TeamVisit) => Date.parse(v.visitAt) < now;

  return (
    <div className="panel vteam">
      <div className="fgroup__head">
        <h3>Sales office visits</h3>
        <div className="chip-row">
          <button className="chip-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week"><Icon name="arrowLeft" size={16} /></button>
          <button className={`chip-btn ${days.includes(today) ? 'is-on' : ''}`} onClick={() => setStart(addDays(today, -weekdayOf(today)))}>This week</button>
          <button className="chip-btn" onClick={() => setStart(addDays(start, 7))} aria-label="Next week"><Icon name="arrowRight" size={16} /></button>
        </div>
      </div>
      <p className="muted small" style={{ margin: '0 0 12px' }}>
        {dayTitle(days[0])} – {dayTitle(days[6])} · Roatán time ·{' '}
        {count('booked')} booked · {count('attended')} attended · {count('no_show')} no-show · {count('cancelled')} cancelled
        {' · '}
        <label className="tiny"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> show cancelled</label>
      </p>

      {items === null ? <div className="muted">Loading visits…</div> : (
        <div className="vteam__week">
          {days.map((d, i) => {
            const list = byDay(d);
            return (
              <section key={d} className={`vteam__day${d === today ? ' is-today' : ''}${list.length ? '' : ' is-empty'}`}>
                <h4>{WEEKDAYS[i]} <span className="muted">{Number(d.slice(8))}</span></h4>
                {list.length === 0 && <span className="tiny muted">No visits</span>}
                {list.map((v) => (
                  <article key={v.id} className={`vteam__visit is-${v.status}`}>
                    <div className="vteam__time">
                      <b>{timeOf(v.visitAt)}</b>
                      <span className={`pill ${STATUS_PILL[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span>
                    </div>
                    <div className="vteam__who">
                      <b>{v.name}</b>
                      {v.phone && <a href={`tel:${v.phone.replace(/[^+\d]/g, '')}`} className="small"> {v.phone}</a>}
                    </div>
                    <div className="tiny muted">
                      {v.developmentSlug
                        ? <Link href={`/developments/${v.developmentSlug}`}>{v.developmentName}</Link>
                        : <Link href={`/listings/${v.listingId}`}>{v.listingTitle || 'the listing'}</Link>}
                      {v.agentId !== meId && v.agentName && ` · ${v.agentName}`}
                      {v.contactVia && ` · prefers ${contactPrefShort(v.contactVia)}`}
                      {v.status === 'cancelled' && v.cancelledBy && ` · by ${v.cancelledBy === 'buyer' ? 'the buyer' : 'the team'}`}
                    </div>
                    {v.interests.length > 0 && <div className="tiny muted">{v.interests.join(', ')}</div>}
                    <div className="vteam__acts">
                      {v.status === 'booked' && past(v) && (
                        <>
                          <button className="btn btn--sm" onClick={() => setStatus(v, 'attended')}>Came</button>
                          <button className="btn btn--sm btn--ghost" onClick={() => setStatus(v, 'no_show')}>No-show</button>
                        </>
                      )}
                      {v.status === 'booked' && !past(v) && (
                        <button className="btn btn--sm btn--ghost" onClick={() => setStatus(v, 'cancelled')}>Cancel</button>
                      )}
                      {v.status !== 'booked' && (
                        <button className="btn btn--sm btn--ghost" onClick={() => setStatus(v, 'booked')}>Undo</button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 12 }}>
        Buyers get reminders 24 hours and 1 hour before the visit, with a link to move or cancel it. You get the same reminders.
      </p>
    </div>
  );
}
