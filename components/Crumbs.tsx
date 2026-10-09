'use client';
import Link from 'next/link';
import { Fragment } from 'react';
import { useT } from './LangProvider';
import { useLp } from './useLp';

/** Видимі хлібні крихти — внизу сторінки, як на LUN. Ту саму послідовність сторінка віддає як BreadcrumbList у JSON-LD. */
export default function Crumbs({ items }: { items: { name: string; path: string }[] }) {
  const t = useT();
  const lp = useLp();
  return (
    <nav className="crumbs crumbs--foot small muted" aria-label={t('Breadcrumb')}>
      {items.map((it, i) => (
        <Fragment key={it.path}>
          {i > 0 && ' · '}
          {i < items.length - 1 ? <Link href={lp(it.path)}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
