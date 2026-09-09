import { Sk, SkCards } from '@/components/Skeleton';

/** Профіль ріелтора: шапка з аватаром, статистика, його обʼєкти. */
export default function AgentLoading() {
  return (
    <div className="wrap">
      <div className="crumbs"><Sk className="sk--line" style={{ maxWidth: 280 }} /></div>

      <header className="org org--person">
        <Sk className="sk--avatar" />
        <div className="sk-stack" style={{ flex: 1 }}>
          <Sk className="sk--title" />
          <Sk className="sk--line" style={{ maxWidth: 200 }} />
          <Sk className="sk--line" style={{ maxWidth: '80%' }} />
        </div>
      </header>

      <div className="stats" style={{ marginTop: 22 }}>
        {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="sk--panel" style={{ minHeight: 66 }} />)}
      </div>

      <section className="section" style={{ paddingTop: 30 }}>
        <SkCards />
      </section>
    </div>
  );
}
