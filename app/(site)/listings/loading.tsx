import { Sk } from '@/components/Skeleton';

/** Пошук: фільтри і список ліворуч, карта праворуч на всю висоту — та сама сітка. */
export default function ListingsLoading() {
  return (
    <>
      <div className="split split--list">
        <div className="split__list">
          <div className="filters">
            <div className="filters__in">
              <Sk className="sk--pill filters__q" style={{ minWidth: 240 }} />
              <Sk className="sk--pill" style={{ width: 150 }} />
              <Sk className="sk--pill" style={{ width: 130 }} />
              <Sk className="sk--pill" style={{ width: 96 }} />
            </div>
          </div>
          <div className="list-head"><Sk className="sk--h1" /></div>
          <div className="grid grid--list">
            {Array.from({ length: 6 }, (_, i) => (
              <Sk key={i} className="sk--card" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        <div className="split__map"><Sk className="sk--map" style={{ height: '100%' }} /></div>
      </div>
    </>
  );
}
