import { Sk } from '@/components/Skeleton';

/** Новобудови: картки ЖК ліворуч, карта праворуч — та сама сітка, що й у пошуку. */
export default function DevelopmentsLoading() {
  return (
    <div className="split split--list" style={{ '--filters-h': '0px' } as React.CSSProperties}>
      <div className="split__list">
        <div className="list-head"><Sk className="sk--h1" /></div>
        <div className="grid grid--list">
          {Array.from({ length: 4 }, (_, i) => (
            <Sk key={i} className="sk--card" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
      <div className="split__map"><Sk className="sk--map" style={{ height: '100%' }} /></div>
    </div>
  );
}
