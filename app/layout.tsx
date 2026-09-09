import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SidebarSlot from '@/components/SidebarSlot';
import Footer from '@/components/Footer';
import Toaster from '@/components/Toaster';

// next/font сам хостить шрифт: раніше сторінка чекала на окремий CSS із fonts.googleapis.com
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Resoha Roatán — property on the Bay Islands',
  description: 'Homes, condos and titled land on Roatán, Honduras — mapped listings, direct agent contacts, buyer and agent accounts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="app">
          <Suspense fallback={<aside className="sidebar" />}>
            <SidebarSlot />
          </Suspense>
          <div className="shell">
            <main>{children}</main>
            <Footer />
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
