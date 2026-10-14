import Script from 'next/script';

// Microsoft Clarity — записи сесій і теплові карти. Як і GA: на продакшені Vercel — проєкт yxc878vu1t,
// NEXT_PUBLIC_CLARITY_ID перекриває його (наприклад, щоб перевірити локально). Прев'ю й локальна розробка не пишуться.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || (process.env.VERCEL_ENV === 'production' ? 'yxc878vu1t' : undefined);

export default function Clarity() {
  if (!CLARITY_ID) return null;
  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});`}
    </Script>
  );
}
