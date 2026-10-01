import { createHash } from 'node:crypto';
import { rateLimitHit } from './db';

/**
 * Захист публічних форм без сторонніх сервісів. Три шари:
 *  - приманка: поле, якого людина не бачить, а бот заповнює;
 *  - час: форму, відправлену швидше ніж за секунду після появи, людина не заповнила б;
 *  - ліміт на адресу: лічильник у базі, бо на серверлесі памʼять процесу нічого не тримає.
 * Це зупиняє масові скрипти, а не цілеспрямовану атаку — для неї потрібна капча.
 */

type Trap = { website?: unknown; ts?: unknown };

export function looksAutomated(body: Trap): boolean {
  if (typeof body.website === 'string' && body.website.trim() !== '') return true;
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || ts <= 0) return true;
  const elapsed = Date.now() - ts;
  return elapsed < 1200 || elapsed > 24 * 60 * 60 * 1000;
}

/** Хеш замість самої адреси: лічильнику потрібна тотожність, а не IP у базі. */
function clientKey(req: Request, action: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  return createHash('sha256').update(`${action}:${ip}`).digest('hex').slice(0, 40);
}

/** true — запит у межах ліміту. Якщо лічильник недоступний, пропускаємо: межі в базі лишаються. */
export async function withinLimit(req: Request, action: string, max: number, windowSeconds: number) {
  try {
    return await rateLimitHit(clientKey(req, action), max, windowSeconds);
  } catch {
    return true;
  }
}

export const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
