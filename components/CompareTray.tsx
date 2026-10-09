'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { useT } from './LangProvider';
import { COMPARE_KEY, COMPARE_MAX, useIds, writeIds } from '@/lib/localLists';

/** Плаваюча плашка: скільки обʼєктів у порівнянні й перехід до таблиці. */
export default function CompareTray() {
  const t = useT();
  const ids = useIds(COMPARE_KEY);
  const pathname = usePathname();
  if (!ids.length || pathname === '/compare') return null;

  return (
    <div className="cmp-tray" role="region" aria-label={t('Compare listings')}>
      <Link className="cmp-tray__go" href="/compare">
        <Icon name="compare" size={18} />
        <span>{t('Compare')} <b>{ids.length}/{COMPARE_MAX}</b></span>
        <Icon name="arrowRight" size={16} />
      </Link>
      <button className="cmp-tray__x" onClick={() => writeIds(COMPARE_KEY, [])} aria-label={t('Clear compare')} title={t('Clear compare')}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
