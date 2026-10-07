'use client';
import { useState } from 'react';
import { fmtNumber, m2ToSqft, sqftToM2 } from '@/lib/format';

/**
 * Площа з перемикачем ft² / m². Вводити можна в будь-якій одиниці — під полем
 * одразу видно перерахунок, а на сервер завжди йде ft² (колонка sqft).
 */
export default function AreaInput({ name, label, defaultSqft }: { name: string; label: string; defaultSqft?: number }) {
  const [unit, setUnit] = useState<'ft2' | 'm2'>('ft2');
  const [sqft, setSqft] = useState(defaultSqft ? Math.round(defaultSqft) : 0);
  const [text, setText] = useState(defaultSqft ? String(Math.round(defaultSqft)) : '');

  const change = (v: string) => {
    setText(v);
    const n = Number(v.replace(',', '.'));
    setSqft(Number.isFinite(n) && n > 0 ? (unit === 'm2' ? m2ToSqft(n) : Math.round(n)) : 0);
  };
  const switchTo = (u: 'ft2' | 'm2') => {
    if (u === unit) return;
    setUnit(u);
    // переводимо вже введене число, щоб площа не змінилась
    setText(sqft ? String(u === 'm2' ? sqftToM2(sqft) : sqft) : '');
  };

  return (
    <div className="field">
      <label className="area-in__label">
        {label}
        <span className="area-in__units" role="group" aria-label="Unit">
          {(['ft2', 'm2'] as const).map((u) => (
            <button key={u} type="button" className={unit === u ? 'is-on' : ''} aria-pressed={unit === u}
              onClick={() => switchTo(u)}>{u === 'ft2' ? 'ft²' : 'm²'}</button>
          ))}
        </span>
      </label>
      <input className="input" type="number" step="any" min="0" inputMode="decimal" value={text}
        onChange={(e) => change(e.target.value)} placeholder={unit === 'm2' ? '115' : '1240'} />
      <input type="hidden" name={name} value={sqft || ''} />
      <span className="tiny muted">
        {sqft ? (unit === 'm2' ? `= ${fmtNumber(sqft)} ft²` : `= ${fmtNumber(sqftToM2(sqft))} m²`) : ' '}
      </span>
    </div>
  );
}
