'use client';
import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC; s.async = true; s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Капча Cloudflare у формі: сама кладе токен у приховане поле cf-turnstile-response.
 * Без NEXT_PUBLIC_TURNSTILE_SITE_KEY нічого не показує.
 */
export default function Turnstile() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id = '';
    let gone = false;
    loadScript().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      id = window.turnstile.render(box.current, { sitekey: SITE_KEY, size: 'flexible', appearance: 'interaction-only' });
    }).catch(() => {});
    return () => { gone = true; if (id) window.turnstile?.remove(id); };
  }, []);
  if (!SITE_KEY) return null;
  return <div ref={box} />;
}

/** Токен із форми — для тіла запиту. */
export const captchaToken = (fd: FormData) => String(fd.get('cf-turnstile-response') ?? '');
