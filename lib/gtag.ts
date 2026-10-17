/**
 * Власні події GA4 з браузера. gtag вантажить GoogleAnalytics лише на продакшені —
 * без нього (прев'ю, локально, блокувальник) виклик нічого не робить і ніколи не кидає.
 */

type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export function gaEvent(name: string, params: Params = {}) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    // порожні поля GA не потрібні — лишаємо лише те, що відомо
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') clean[k] = v;
    window.gtag('event', name, clean);
  } catch {
    // аналітика не має ламати кнопку
  }
}

export type LeadMethod = 'whatsapp' | 'phone' | 'viber' | 'telegram' | 'form' | 'agency_link';

/** generate_lead; ціни в базі завжди в доларах, валюта на екрані — лише відображення. */
export function gaLead(method: LeadMethod, p: {
  listingId?: string | null; agentId?: string | null; developmentId?: string | null; price?: number | null;
}) {
  gaEvent('generate_lead', {
    method,
    listing_id: p.listingId,
    agent_id: p.agentId,
    development_id: p.developmentId,
    ...(p.price && p.price > 0 ? { price: p.price, currency: 'USD' } : {}),
  });
}
