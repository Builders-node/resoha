'use client';
import { useEffect, useState } from 'react';

/**
 * Вкладки сторінки ЖК, як у LUN: липнуть до верху й підсвічують розділ, який зараз на екрані.
 * Поки це якорі на тій самій сторінці — окремі сторінки не потрібні, доки розділи короткі.
 */
export default function DevelopmentNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    // активний — останній розділ, верх якого вже пройшов під смугою вкладок
    const onScroll = () => {
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= 90) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  return (
    <nav className="dnav" aria-label="Development sections">
      <div className="dnav__row">
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className={`dnav__tab${active === i.id ? ' is-on' : ''}`}
            aria-current={active === i.id ? 'true' : undefined}>{i.label}</a>
        ))}
      </div>
    </nav>
  );
}
