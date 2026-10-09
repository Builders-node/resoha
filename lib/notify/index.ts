import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { newListingsSince } from '../db';
import { toListingQuery } from '../filters';
import { SITE_NAME } from '../site';
import { supabaseAnon } from '../supabase/anon';
import { render, type Card } from './templates';

/**
 * Відправка сповіщень із черги notify_outbox (міграція 0050).
 * Пошта — Resend (RESEND_API_KEY, EMAIL_FROM), Telegram — бот (TELEGRAM_BOT_TOKEN).
 * Без ключа канал просто мовчить: рядок позначається відправленим з поміткою, щоб не копитись.
 * Секрет — той самий рядок, що в private.promo_config (NOTIFY_SECRET або PROMO_SECRET).
 */
export const notifySecret = () => process.env.NOTIFY_SECRET || process.env.PROMO_SECRET || '';

const EMAIL_FROM = () => process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.dev>`;

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'email: RESEND_API_KEY is not set';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM(), to: [to], subject, html, text }),
  });
  return res.ok ? null : `email ${res.status}: ${(await res.text()).slice(0, 200)}`;
}

export async function sendTelegram(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 'telegram: TELEGRAM_BOT_TOKEN is not set';
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  return res.ok ? null : `telegram ${res.status}: ${(await res.text()).slice(0, 200)}`;
}

type Claimed = {
  id: number; kind: string; email: string; name: string;
  telegram_chat_id: number | null; unsub_token: string | null; payload: Record<string, unknown>;
};

/**
 * Одна партія з черги. Помилка одного каналу не губить інший: якщо хоч один дійшов — рядок
 * закритий; якщо всі впали — функція спробує ще (до 5 разів, див. notify_claim).
 */
export async function processOutbox(client: SupabaseClient = supabaseAnon(), batches = 4) {
  const secret = notifySecret();
  if (!secret) return { sent: 0, failed: 0, skipped: 'NOTIFY_SECRET/PROMO_SECRET is not set' };
  let sent = 0, failed = 0;
  for (let b = 0; b < batches; b++) {
    const { data, error } = await client.rpc('notify_claim', { p_secret: secret, p_limit: 25 });
    if (error) {
      // до міграції 0050 функції немає — тихо виходимо
      if (!/notify_claim/.test(error.message)) console.error('notify_claim failed:', error.message);
      break;
    }
    const rows = (data ?? []) as Claimed[];
    if (!rows.length) break;
    await Promise.all(rows.map(async (r) => {
      const msg = render(r.kind, r.payload, r.unsub_token);
      const errors: string[] = [];
      let delivered = false;
      if (msg && r.email && msg.html) {
        const e = await sendEmail(r.email, msg.subject, msg.html, msg.text).catch((x) => `email: ${(x as Error).message}`);
        if (e) errors.push(e); else delivered = true;
      }
      if (msg && r.telegram_chat_id && msg.telegram) {
        const e = await sendTelegram(r.telegram_chat_id, msg.telegram).catch((x) => `telegram: ${(x as Error).message}`);
        if (e) errors.push(e); else delivered = true;
      }
      // нема куди слати (вимкнено, немає адреси, немає ключа) — закриваємо, щоб не повторювати
      const retry = !delivered && errors.some((e) => !/is not set/.test(e));
      const { error: doneErr } = await client.rpc('notify_done', {
        p_secret: secret, p_id: r.id, p_error: retry ? errors.join('; ') : null,
      });
      if (doneErr) console.error('notify_done failed:', doneErr.message);
      if (retry) failed++; else sent++;
    }));
    if (rows.length < 25) break;
  }
  return { sent, failed };
}

/** Добірки за збереженими пошуками: раз на добу, лише якщо зʼявились нові обʼєкти. */
export async function runSavedSearchAlerts(client: SupabaseClient = supabaseAnon()) {
  const secret = notifySecret();
  if (!secret) return 0;
  const { data, error } = await client.rpc('alerts_due', { p_secret: secret });
  if (error) {
    if (!/alerts_due/.test(error.message)) console.error('alerts_due failed:', error.message);
    return 0;
  }
  let queued = 0;
  for (const s of (data ?? []) as { id: string; title: string; query: string; since: string }[]) {
    try {
      const { items, count } = await newListingsSince(client, toListingQuery(new URLSearchParams(s.query)), s.since, 5);
      const payload = count > 0 ? {
        title: s.title, query: s.query, count,
        items: items.map((l): Card => ({
          id: l.id, title: l.title, price: l.price, deal: l.deal, type: l.type, neighborhood: l.neighborhood,
          photo: l.photos[0] ?? '', development: l.development?.name ?? '', developmentSlug: l.development?.slug ?? '',
        })),
      } : null;
      const { error: markErr } = await client.rpc('alerts_mark', { p_secret: secret, p_search: s.id, p_payload: payload });
      if (markErr) console.error('alerts_mark failed:', markErr.message);
      else if (payload) queued++;
    } catch (e) {
      console.error('saved search alert failed:', (e as Error).message);
    }
  }
  return queued;
}

/**
 * Відправити чергу одразу після відповіді — щоб ріелтор дізнався про заявку за секунди,
 * а не з наступним проходом cron. Падіння тут ні на що не впливає: рядок лишиться в черзі.
 */
export function kickNotifications() {
  if (!notifySecret()) return;
  try {
    after(async () => {
      try { await processOutbox(supabaseAnon(), 1); } catch (e) { console.error('notify kick failed:', (e as Error).message); }
    });
  } catch {
    // поза запитом after() недоступний — черга дочекається cron
  }
}
