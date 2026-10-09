import { NextResponse } from 'next/server';
import { getNotifySettings, updateNotifySettings } from '@/lib/db';
import { currentUser } from '@/lib/session';

/** Свої налаштування сповіщень: листи вкл/викл і привʼязка Telegram (лише ріелторам). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const settings = await getNotifySettings(user.id);
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? '';
  return NextResponse.json({
    settings: settings && {
      emailLeads: settings.emailLeads, emailAlerts: settings.emailAlerts, telegramLinked: settings.telegramLinked,
      // посилання на бота — лише ріелтору й лише коли бот налаштований
      telegramLink: user.role === 'agent' && bot ? `https://t.me/${bot.replace(/^@/, '')}?start=${settings.telegramToken}` : '',
    },
    email: user.email,
  });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    await updateNotifySettings(user.id, {
      emailLeads: typeof body.emailLeads === 'boolean' ? body.emailLeads : undefined,
      emailAlerts: typeof body.emailAlerts === 'boolean' ? body.emailAlerts : undefined,
      unlinkTelegram: body.unlinkTelegram === true,
    });
  } catch {
    return NextResponse.json({ error: 'Could not save' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
