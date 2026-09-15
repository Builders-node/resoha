'use client';
import { useEffect, useRef } from 'react';

/**
 * Ряд вкладок кабінету. На вузькому екрані він їде горизонтально, тому активну
 * вкладку підкручуємо у видиму зону — інакше після переходу вона лишалась би
 * за краєм, і було б незрозуміло, де ти взагалі перебуваєш.
 *
 * Крутимо сам контейнер, а не scrollIntoView: той чіпляє прокрутку сторінки, а
 * плавну анімацію збиває перебудова вмісту вкладки, і ряд лишався на місці.
 */
export default function TabStrip({ children }: { children: React.ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const last = useRef<Element | null>(null);

  useEffect(() => {
    const box = nav.current;
    const active = box?.querySelector<HTMLElement>('.is-active') ?? null;
    if (!box || !active || active === last.current) return;
    last.current = active;

    // на десктопі ряд вертикальний і нікуди не прокручується
    if (box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: Math.max(0, active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2) });
  });

  return <nav className="sidenav" ref={nav}>{children}</nav>;
}
