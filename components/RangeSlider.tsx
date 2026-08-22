'use client';

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  histogram?: number[];
};

/** Двоповзунковий діапазон з гістограмою розподілу (як у фільтрах ЛУН). */
export default function RangeSlider({ min, max, step = 1, value, onChange, histogram }: Props) {
  const span = Math.max(1, max - min);
  const [lo, hi] = value;
  const pct = (v: number) => ((Math.min(Math.max(v, min), max) - min) / span) * 100;

  const setLo = (v: number) => onChange([Math.min(v, hi), hi]);
  const setHi = (v: number) => onChange([lo, Math.max(v, lo)]);

  const peak = histogram?.length ? Math.max(...histogram) : 0;

  return (
    <div className="rs">
      {!!histogram?.length && (
        <div className="rs__hist" aria-hidden>
          {histogram.map((c, i) => {
            const from = min + (span / histogram.length) * i;
            const to = from + span / histogram.length;
            const inRange = to >= lo && from <= hi;
            return (
              <span
                key={i}
                className={`rs__bar ${inRange ? 'is-in' : ''}`}
                style={{ height: `${peak ? Math.max(4, (c / peak) * 100) : 4}%` }}
              />
            );
          })}
        </div>
      )}

      <div className="rs__track">
        <span className="rs__rail" />
        <span className="rs__fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          aria-label="Minimum"
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          aria-label="Maximum"
        />
      </div>
    </div>
  );
}
