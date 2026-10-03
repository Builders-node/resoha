import { Sk, SkCards, SkSectionHead } from '@/components/Skeleton';

/** Головна: плитки + промо, далі дві добірки карток. */
export default function HomeLoading() {
  return (
    <>
      <section className="wrap home-top">
        <div className="tiles-block">
          <Sk className="sk--pill" style={{ height: 52, marginBottom: 18 }} />
          <Sk className="sk--line" style={{ maxWidth: 90, marginBottom: 10 }} />
          <div className="tiles">
            {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="sk--tile" />)}
          </div>
          <Sk className="sk--line" style={{ maxWidth: 90, margin: '18px 0 10px' }} />
          <div className="tiles">
            <Sk className="sk--tile tile--wide" />
            <Sk className="sk--tile tile--wide" />
          </div>
        </div>
        <Sk style={{ borderRadius: 'var(--radius-lg)', minHeight: 260 }} />
      </section>

      <section className="section">
        <div className="wrap">
          <SkSectionHead />
          <SkCards tall />
        </div>
      </section>

      <section className="section section--soft">
        <div className="wrap">
          <SkSectionHead />
          <SkCards />
        </div>
      </section>
    </>
  );
}
