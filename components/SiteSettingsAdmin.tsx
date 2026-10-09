'use client';
import { useEffect, useState } from 'react';
import { toast } from './Toaster';
import type { SiteSettings } from '@/lib/types';

const ROWS: { key: keyof SiteSettings; label: string; hint: string }[] = [
  { key: 'showPurchaseCosts', label: 'Purchase costs', hint: 'Transfer tax, legal and registration estimate on sale listings.' },
  { key: 'showFinancing', label: 'Financing calculator', hint: 'Loan, owner financing and cash monthly payment on sale listings.' },
];

/** Перемикачі сайту: діють одразу на всі оголошення, без релізу. */
export default function SiteSettingsAdmin() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => d.settings && setS(d.settings)).catch(() => {});
  }, []);

  const flip = async (key: keyof SiteSettings) => {
    if (!s || busy) return;
    const next = !s[key];
    setBusy(true);
    setS({ ...s, [key]: next });
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [key]: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not save');
      setS(d.settings);
      toast(next ? 'Shown on listings' : 'Hidden on listings');
    } catch (e) {
      setS({ ...s, [key]: !next });
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>Listing page</h3>
      <p className="muted small" style={{ marginBottom: 12 }}>Blocks under “Cost to buy and financing”, for every sale listing.</p>
      {!s ? <p className="muted small">Loading…</p> : ROWS.map((r) => (
        <div className="switch-row" key={r.key}>
          <span className="switch-row__label">{r.label}<br /><span className="muted small">{r.hint}</span></span>
          <button className={`switch ${s[r.key] ? 'is-on' : ''}`} disabled={busy}
            onClick={() => flip(r.key)} aria-label={r.label} aria-pressed={s[r.key]} />
        </div>
      ))}
    </div>
  );
}
