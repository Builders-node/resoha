import { Sk, SkCards, SkSectionHead } from '@/components/Skeleton';

/** Сторінка агенції: брендова шапка, статистика, команда, обʼєкти. */
export default function AgencyLoading() {
  return (
    <div className="wrap">
      <div className="crumbs"><Sk className="sk--line" style={{ maxWidth: 240 }} /></div>

      <header className="org">
        <Sk className="sk--avatar" style={{ borderRadius: 'var(--radius)' }} />
        <div className="sk-stack" style={{ flex: 1 }}>
          <Sk className="sk--title" />
          <Sk className="sk--line" style={{ maxWidth: '70%' }} />
          <Sk className="sk--line" style={{ maxWidth: 320 }} />
        </div>
      </header>

      <div className="stats" style={{ marginTop: 22 }}>
        {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="sk--panel" style={{ minHeight: 66 }} />)}
      </div>

      <section className="section" style={{ paddingTop: 30 }}>
        <SkSectionHead />
        <div className="grid grid--4">
          {Array.from({ length: 4 }, (_, i) => (
            <Sk key={i} style={{ borderRadius: 'var(--radius)', height: 86 }} />
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <SkCards />
      </section>
    </div>
  );
}
