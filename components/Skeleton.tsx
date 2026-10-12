/** Дрібні цеглинки для loading.tsx — щоб каркаси не розповзались по стилях. */
export function Sk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`sk ${className}`.trim()} style={style} aria-hidden="true" />;
}

/** Сітка карток тієї ж форми, що й реальні: висота не стрибне після завантаження. */
export function SkCards({ n = 4, tall = false, cols = 4 }: { n?: number; tall?: boolean; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid--${cols}`}>
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

/** Рядки списку чи таблиці в панелі кабінету: заголовок і кілька смуг. */
export function SkRows({ n = 4, title = true }: { n?: number; title?: boolean }) {
  return (
    <div className="sk-stack" aria-busy="true">
      {title && <Sk className="sk--title" style={{ maxWidth: 220, marginBottom: 6 }} />}
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className="sk--row" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

/** Панель кабінету, поки вантажиться: та сама рамка, що й у справжньої. */
export function SkPanel({ n = 4 }: { n?: number }) {
  return <div className="panel"><SkRows n={n} /></div>;
}

/**
 * Каркас кабінету (ріелтор, адмін, покупець): меню ліворуч, шапка профілю,
 * цифри й панель — сторінка не стрибає, коли приходять справжні дані.
 */
export function SkDashboard({ stats = true, nav = 7 }: { stats?: boolean; nav?: number }) {
  return (
    <div className="wrap dash" aria-busy="true" aria-label="Loading">
      <div className="sidenav sk-nav">
        {Array.from({ length: nav }, (_, i) => (
          <Sk key={i} className="sk--nav" style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <div>
        <div className="profile-head">
          <Sk className="sk--avatar" style={{ width: 72, height: 72 }} />
          <div className="sk-stack" style={{ flex: 1 }}>
            <Sk className="sk--title" style={{ maxWidth: 220 }} />
            <Sk className="sk--line" style={{ maxWidth: 160 }} />
          </div>
        </div>
        {stats && (
          <div className="stats">
            {Array.from({ length: 4 }, (_, i) => (
              <Sk key={i} className="sk--stat" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        )}
        <SkPanel n={5} />
      </div>
    </div>
  );
}
