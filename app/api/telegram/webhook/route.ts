import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { notifySecret, sendTelegram } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import { supabaseAnon } from '@/lib/supabase/anon';

/**
 * Вебхук бота. Ріелтор у кабінеті тисне «Connect Telegram» → t.me/<бот>?start=<токен>,
 * бот отримує «/start <токен>» і привʼязує чат до акаунта. Telegram підписує запит заголовком
 * X-Telegram-Bot-Api-Secret-Token (TELEGRAM_WEBHOOK_SECRET, задається в setWebhook).
 */
export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }

  const update = await req.json().catch(() => ({}));
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text: string = typeof msg?.text === 'string' ? msg.text.trim() : '';
  // відповідаємо Telegram 200 завжди: інакше він повторюватиме те саме оновлення
  if (!chatId || msg?.chat?.type !== 'private') return NextResponse.json({ ok: true });

  const token = text.match(/^\/start\s+([a-f0-9]{20,64})$/i)?.[1];
  if (!token) {
    await sendTelegram(chatId, `Hi! This bot sends Resoha enquiries and visit bookings to realtors. To connect it, open your dashboard → Profile → Notifications and press “Connect Telegram”: ${SITE_URL}/agent`);
    return NextResponse.json({ ok: true });
  }

  const { data: name, error } = await supabaseAnon().rpc('telegram_link', {
    p_secret: notifySecret(), p_token: token, p_chat: chatId,
  });
  if (error) console.error('telegram_link failed:', error.message);
  await sendTelegram(chatId, name
    ? `Connected, ${String(name).split(' ')[0]}. New enquiries, visit bookings and listing updates will arrive here.`
    : 'This link has expired. Open your Resoha dashboard → Profile → Notifications and press “Connect Telegram” again.');
  return NextResponse.json({ ok: true });
}
