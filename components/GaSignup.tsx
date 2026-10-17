'use client';
import { useEffect } from 'react';
import { gaEvent } from '@/lib/gtag';

/**
 * Реєстрація через Google закінчується редиректом, тож sign_up шлемо тут:
 * /auth/callback додає до адреси ?ga_signup=google | google_agent лише для щойно створеного акаунта.
 * Позначку одразу прибираємо, щоб оновлення сторінки не рахувало реєстрацію вдруге.
 */
export default function GaSignup() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('ga_signup');
    if (!flag) return;
    url.searchParams.delete('ga_signup');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (flag !== 'google' && flag !== 'google_agent') return;
    // gtag вантажиться afterInteractive — може ще не встигнути; чекаємо до 5 с, потім здаємось.
    // Таймер не скасовуємо: позначку вже прибрано, другого шансу (StrictMode) не буде
    let tries = 0;
    const send = () => {
      if (typeof window.gtag !== 'function' && ++tries < 20) { window.setTimeout(send, 250); return; }
      gaEvent('sign_up', { method: 'google' });
      if (flag === 'google_agent') gaEvent('agent_sign_up', { method: 'google', account: 'agent' });
    };
    send();
  }, []);
  return null;
}
