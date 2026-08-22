import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Toaster from '@/components/Toaster';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Resoha Roatán — property on the Bay Islands',
  description: 'Homes, condos and titled land on Roatán, Honduras — mapped listings, direct agent contacts, buyer and agent accounts.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app">
          <Suspense fallback={<aside className="sidebar" />}>
            <Sidebar session={session} />
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
