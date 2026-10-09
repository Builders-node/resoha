'use client';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';

type Settings = { emailLeads: boolean; emailAlerts: boolean; telegramLinked: boolean; telegramLink: string };

/**
 * Куди слати сповіщення. Ріелтору — заявки й візити на пошту та в Telegram;
 * покупцю — добірки за збереженими пошуками і зниження цін на збережене.
 */
export default function NotifySettings({ agent }: { agent: boolean }) {
  const t = useT();
  const [s, setS] = useState<Settings | null>(null);
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch('/api/notify/settings').then((r) => r.json()).catch(() => ({}));
    setS(d.settings ?? null);
    setEmail(d.email ?? '');
    setReady(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  // вернувся з Telegram — перевіримо, чи привʼязався чат
  useEffect(() => {
    const onFocus = () => { if (s && !s.telegramLinked && s.telegramLink) load(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [s, load]);

  async function save(patch: Partial<Settings> & { unlinkTelegram?: boolean }) {
    const res = await fetch('/api/notify/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    toast(res.ok ? t('Saved') : t('Could not save'));
    load();
  }

  // до міграції 0050 налаштувань немає — блок просто не показуємо
  if (!ready || !s) return null;

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>{t('Notifications')}</h3>
      <p className="muted small" style={{ marginBottom: 14 }}>
        {t('Emails go to {email}.', { email: email || '—' })}
      </p>
      <div className="notify-list">
        {agent && (
          <label className="notify-row">
            <span>
              <b>{t('Enquiries and visit bookings')}</b>
              <span className="tiny muted">{t('The moment a buyer writes or books a visit, plus reminders a day before and when a listing is about to expire.')}</span>
            </span>
            <input type="checkbox" role="switch" checked={s.emailLeads} onChange={(e) => save({ emailLeads: e.target.checked })} />
          </label>
        )}
        <label className="notify-row">
          <span>
            <b>{t('Saved searches and price drops')}</b>
            <span className="tiny muted">{t('A daily email when new properties match a saved search, and when a saved property gets cheaper.')}</span>
          </span>
          <input type="checkbox" role="switch" checked={s.emailAlerts} onChange={(e) => save({ emailAlerts: e.target.checked })} />
        </label>
        {agent && (s.telegramLinked || s.telegramLink) && (
          <div className="notify-row">
            <span>
              <b>Telegram</b>
              <span className="tiny muted">
                {s.telegramLinked
                  ? t('Connected. Enquiries and visit bookings also arrive in Telegram.')
                  : t('Get enquiries and visit bookings in Telegram as well. Press Connect, then Start in the bot.')}
              </span>
            </span>
            {s.telegramLinked ? (
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => save({ unlinkTelegram: true })}>{t('Disconnect')}</button>
            ) : (
              <a className="btn btn--sm btn--primary" href={s.telegramLink} target="_blank" rel="noreferrer">
                <Icon name="chat" size={15} /> {t('Connect')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
