import { Sk, SkCards } from '@/components/Skeleton';

/** Профіль ріелтора: шапка з аватаром і фактами, його обʼєкти. */
export default function AgentLoading() {
  return (
    <div className="wrap">
      <div className="crumbs"><Sk className="sk--line" style={{ maxWidth: 280 }} /></div>

      <header className="agent-hero">
        <div className="agent-hero__main">
          <Sk className="sk--avatar" />
          <div className="sk-stack" style={{ flex: 1 }}>
            <Sk className="sk--title" />
            <Sk className="sk--line" style={{ maxWidth: 200 }} />
            <Sk className="sk--line" style={{ maxWidth: '80%' }} />
          </div>
        </div>
      </header>

      <section className="section agent-list">
        <SkCards />
      </section>
    </div>
  );
}
