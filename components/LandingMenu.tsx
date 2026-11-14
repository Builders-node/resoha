'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

/**
 * Бургер шапки контентних сторінок: ≤1080px рядок посилань ховається (CSS), а ця кнопка
 * відкриває їх списком під шапкою. Закривається переходом, Esc і кліком поза списком.
 */
export default function LandingMenu({ items, label, closeLabel }: {
  items: { href: string; name: string }[];
  label: string;
  closeLabel: string;
}) {
  const path = usePathname();
  // меню пам'ятає сторінку, на якій його відкрили: після переходу воно закрите само собою
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button" className="lp-burger" aria-expanded={open} aria-controls="lp-menu"
        aria-label={open ? closeLabel : label} onClick={() => setOpen(!open)}
      >
        <Icon name={open ? 'close' : 'menu'} size={22} />
      </button>
      {open && (
        <div className="lp-menu" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <nav id="lp-menu" className="lp-menu__list" aria-label={label}>
            {items.map((i) => (
              <Link key={i.href} href={i.href} aria-current={path === i.href ? 'page' : undefined} onClick={() => setOpen(false)}>
                {i.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
