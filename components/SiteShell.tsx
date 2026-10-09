import { Suspense } from 'react';
import SidebarSlot from './SidebarSlot';
import Footer from './Footer';
import CompareTray from './CompareTray';

/** Каркас каталогу: темна рейка зліва, контент і футер. Лендинги живуть без нього. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Suspense fallback={<aside className="sidebar" />}>
        <SidebarSlot />
      </Suspense>
      <div className="shell">
        <main>{children}</main>
        <Footer />
      </div>
      <CompareTray />
    </div>
  );
}
