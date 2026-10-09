'use client';
import { useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { officeToday } from '@/lib/visits';
import type { Development } from '@/lib/types';

/**
 * Запис на візит: скільки людей приймає відділ продажів в один слот і в які дні він зачинений
 * (свята, вихідні дні офісу). Зберігається окремо від решти полів ЖК (див. /visit-settings).
 */
export default function VisitSettings({ dev, onSaved }: {
  dev: Development;
  onSaved: (capacity: number, blackout: string[]) => void;
}) {
  const today = officeToday();
  const [capacity, setCapacity] = useState(dev.visitCapacity || 1);
  const [days, setDays] = useState<string[]>(() => (dev.blackoutDates ?? []).filter((d) => d >= today));
  const [pick, setPick] = useState('');
  const [saving, setSaving] = useState(false);

  function add() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pick) || pick < today) return toast('Pick a date from today on');
    setDays((v) => [...new Set([...v, pick])].sort());
    setPick('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/developments/${dev.id}/visit-settings`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capacity, blackout: days }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(d.error ?? 'Could not save');
    onSaved(d.capacity, d.blackout);
    toast('Visit booking settings saved');
  }

  const fmt = (d: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${d}T12:00:00Z`));

  return (
    <form className="form-grid" onSubmit={save} style={{ marginTop: 28 }}>
      <div className="field full">
        <h4 style={{ margin: 0 }}>Visit booking</h4>
        <span className="tiny muted">How many buyers the sales office can see at once, and days it is closed.</span>
      </div>
      <div className="field"><label>Visits per 30-minute slot</label>
        <input className="input" type="number" min={1} max={20} value={capacity}
          onChange={(e) => setCapacity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
        <span className="tiny muted">A slot disappears from the booking calendar once it is full.</span></div>
      <div className="field full"><label>Closed on (holidays)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" type="date" min={today} value={pick} onChange={(e) => setPick(e.target.value)} style={{ maxWidth: 200 }} />
          <button type="button" className="btn btn--ghost" onClick={add} disabled={!pick}><Icon name="plus" size={14} /> Add day</button>
        </div>
        {days.length > 0 ? (
          <div className="vsettings__days">
            {days.map((d) => (
              <span key={d} className="fchip">{fmt(d)}
                <button type="button" aria-label={`Remove ${d}`} onClick={() => setDays((v) => v.filter((x) => x !== d))}>
                  <Icon name="close" size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : <span className="tiny muted">No closed days. Booked visits on a day you close stay in your calendar.</span>}
      </div>
      <div className="field full" style={{ flexDirection: 'row', gap: 8 }}>
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
