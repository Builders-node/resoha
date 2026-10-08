import Script from 'next/script';

// Google Analytics 4. ID береться з NEXT_PUBLIC_GA_ID (Vercel → Settings → Environment Variables);
// поки змінної немає, нічого не вантажимо. Переходи між сторінками GA рахує сам
// (Enhanced measurement → «Page changes based on browser history events»), тому окремо їх не шлемо.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
