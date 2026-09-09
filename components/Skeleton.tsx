/** Дрібні цеглинки для loading.tsx — щоб каркаси не розповзались по стилях. */
export function Sk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`sk ${className}`.trim()} style={style} aria-hidden="true" />;
}

/** Сітка карток тієї ж форми, що й реальні: висота не стрибне після завантаження. */
export function SkCards({ n = 4, tall = false }: { n?: number; tall?: boolean }) {
  return (
    <div className="grid grid--4">
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className={`sk--card ${tall ? 'sk--tall' : ''}`} style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

export function SkSectionHead() {
  return (
    <div className="sk-head">
      <Sk className="sk--title" />
      <Sk className="sk--line" style={{ maxWidth: 240 }} />
    </div>
  );
}
