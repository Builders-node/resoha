import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import Motion from '@/components/Motion';
import AuthModal from '@/components/AuthModal';
import JsonLd from '@/components/JsonLd';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { graph, organizationLd, websiteLd } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import LangProvider from '@/components/LangProvider';
import { getLang } from '@/lib/i18n/server';
import CurrencyProvider from '@/components/CurrencyProvider';
import { getCurrencyRate } from '@/lib/currencyServer';
import { makeT } from '@/lib/i18n';
import { OG_LOCALE } from '@/lib/seoMeta';

// next/font сам хостить шрифт: раніше сторінка чекала на окремий CSS із fonts.googleapis.com
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = makeT(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: `${t('Roatán Real Estate: Homes, Condos & Land for Sale')} | Resoha`,
    description: t('Every property on Roatán in one checked place: homes, condos, rentals and land from island agencies, with a land passport on every lot and direct WhatsApp contact with agents.'),
    openGraph: { siteName: SITE_NAME, type: 'website', locale: OG_LOCALE[lang] },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const money = await getCurrencyRate();
  return (
    <html lang={lang} className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <LangProvider lang={lang}>
        <CurrencyProvider cur={money.cur} rate={money.rate}>
        {/* хто ми — на кожній сторінці, щоб пошуковики й AI-асистенти звʼязували всі сторінки з одним брендом */}
        <JsonLd data={graph(organizationLd(), websiteLd())} />
        {children}
        <Toaster />
        <Motion />
        {/* useSearchParams усередині — тому власна межа Suspense */}
        <Suspense fallback={null}><AuthModal /></Suspense>
        </CurrencyProvider>
        </LangProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
