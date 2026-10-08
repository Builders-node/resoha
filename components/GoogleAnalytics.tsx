import Script from 'next/script';

// Google Analytics 4. На продакшені Vercel — потік сайту G-MPK4B66TKZ; NEXT_PUBLIC_GA_ID перекриває його
// (наприклад, щоб перевірити локально). Прев'ю-деплої й локальна розробка статистику не засмічують.
// Переходи між сторінками GA рахує сам (Enhanced measurement → «Page changes based on browser history events»).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || (process.env.VERCEL_ENV === 'production' ? 'G-MPK4B66TKZ' : undefined);

export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`}
      </Script>
    </>
  );
}
