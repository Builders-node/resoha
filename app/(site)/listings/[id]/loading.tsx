import { Sk } from '@/components/Skeleton';

/** Сторінка обʼєкта: галерея, характеристики, картка ріелтора праворуч. */
export default function PropertyLoading() {
  return (
    <div className="wrap">
      <div className="crumbs"><Sk className="sk--line" style={{ maxWidth: 260 }} /></div>

      <Sk className="sk--gallery" />

      <div className="prop">
        <div className="sk-stack" style={{ gap: 16 }}>
          <Sk className="sk--h1" />
          <Sk className="sk--line" style={{ maxWidth: 300 }} />
          <Sk className="sk--title" style={{ maxWidth: 200, height: 30 }} />

          <div className="specs">
            {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="sk--panel" style={{ minHeight: 66 }} />)}
          </div>

          <div className="sk-row">
            {Array.from({ length: 4 }, (_, i) => <Sk key={i} className="sk--pill" style={{ width: 110, height: 32 }} />)}
          </div>

          <div className="sk-stack">
            <Sk className="sk--line" /><Sk className="sk--line" /><Sk className="sk--line" style={{ maxWidth: '70%' }} />
          </div>

          <Sk className="sk--map" style={{ minHeight: 320 }} />
        </div>

        <Sk className="sk--panel" style={{ minHeight: 420 }} />
      </div>
    </div>
  );
}
