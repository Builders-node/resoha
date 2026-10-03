import Link from 'next/link';
import { Fragment } from 'react';

/** Видимі хлібні крихти. Ту саму послідовність сторінка віддає як BreadcrumbList у JSON-LD. */
export default function Crumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav className="crumbs small muted" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <Fragment key={it.path}>
          {i > 0 && ' · '}
          {i < items.length - 1 ? <Link href={it.path}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
