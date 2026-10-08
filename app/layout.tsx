import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import Motion from '@/components/Motion';
import AuthModal from '@/components/AuthModal';
import JsonLd from '@/components/JsonLd';
import { graph, organizationLd, websiteLd } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import LangProvider from '@/components/LangProvider';
import { getLang } from '@/lib/i18n/server';

// next/font сам хостить шрифт: раніше сторінка чекала на окремий CSS із fonts.googleapis.com
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Roatán Real Estate: Homes, Condos & Land for Sale | Resoha',
  description: 'Every property on Roatán in one checked place: homes, condos, rentals and land from island agencies, with a land passport on every lot and direct WhatsApp contact with agents.',
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <LangProvider lang={lang}>
        {/* хто ми — на кожній сторінці, щоб пошуковики й AI-асистенти звʼязували всі сторінки з одним брендом */}
        <JsonLd data={graph(organizationLd(), websiteLd())} />
        {children}
        <Toaster />
        <Motion />
        {/* useSearchParams усередині — тому власна межа Suspense */}
        <Suspense fallback={null}><AuthModal /></Suspense>
        </LangProvider>
      </body>
    </html>
  );
}
