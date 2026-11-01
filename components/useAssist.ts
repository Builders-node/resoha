'use client';
import { useEffect, useState } from 'react';

/** Чи налаштована допомога з описом (ANTHROPIC_API_KEY на сервері). Питаємо раз на сесію сторінки. */
let cached: Promise<boolean> | null = null;
export function useAssistAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    cached ??= fetch('/api/listings/assist').then((r) => r.json()).then((d) => Boolean(d.available)).catch(() => false);
    let live = true;
    cached.then((v) => { if (live) setOk(v); });
    return () => { live = false; };
  }, []);
  return ok;
}

export async function assist(body: Record<string, unknown>): Promise<{ text?: string; error?: string }> {
  const res = await fetch('/api/listings/assist', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { error: 'Network error' };
  return res.json().catch(() => ({ error: 'Something went wrong' }));
}

/** Записати текст у неконтрольоване поле так, щоб форма (автозбереження) побачила зміну */
export function setFieldValue(el: HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Характеристики з форми рядками «поле: значення» — сировина для чернетки опису */
export function formFacts(form: HTMLFormElement, extra: Record<string, string> = {}) {
  const skip = new Set(['text', 'textEs', 'tags']);
  const lines: string[] = [];
  for (const [k, v] of new FormData(form).entries()) {
    if (skip.has(k) || typeof v !== 'string') continue;
    const s = v.trim();
    if (!s || s === '0' || s.length > 300 || /^https?:/.test(s)) continue;
    lines.push(`${k.replace(/^detail_|^land_/, '')}: ${s === 'on' ? 'yes' : s}`);
  }
  for (const [k, v] of Object.entries(extra)) if (v) lines.push(`${k}: ${v}`);
  return lines.join('\n');
}
