import { Sk, SkSectionHead } from '@/components/Skeleton';

/** Каталог: плитки агенцій, потім картки риелторів. */
export default function AgentsLoading() {
  return (
    <div className="wrap">
      <div className="crumbs"><Sk className="sk--line" style={{ maxWidth: 200 }} /></div>
      <div className="sk-head"><Sk className="sk--h1" /><Sk className="sk--line" style={{ maxWidth: 420 }} /></div>

      <section className="section">
        <SkSectionHead />
        <div className="agc-row">
          {Array.from({ length: 5 }, (_, i) => (
            <Sk key={i} style={{ borderRadius: 'var(--radius)', minHeight: 210, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <SkSectionHead />
        <div className="grid grid--4">
          {Array.from({ length: 4 }, (_, i) => (
            <Sk key={i} style={{ borderRadius: 'var(--radius)', height: 86, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </section>
    </div>
  );
}
