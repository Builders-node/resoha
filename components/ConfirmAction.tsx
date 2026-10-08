'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';

export type Ask = {
  title: string;
  text?: string;
  confirmLabel: string;
  danger?: boolean;
  /** Причина потрапляє в журнал; для незворотних дій вимагаємо її обовʼязково. */
  reasonRequired?: boolean;
  onConfirm: (reason: string) => void;
};

/**
 * Раніше блокування й зняття з публікації спрацьовували з одного кліку і не
 * лишали сліду. Тепер дію треба підтвердити й пояснити — пояснення йде в журнал.
 */
export default function ConfirmAction({ ask, onClose }: { ask: Ask | null; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ask) return;
    setReason('');
    const t = setTimeout(() => input.current?.focus(), 30);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); };
  }, [ask, onClose]);

  if (!ask) return null;
  const blocked = ask.reasonRequired && reason.trim().length < 3;

  return (
    <div className="modal is-open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box modal__box--sm" role="dialog" aria-modal="true">
        <h3 style={{ fontSize: 20 }}>{ask.title}</h3>
        {ask.text && <p className="muted small" style={{ margin: '8px 0 0' }}>{ask.text}</p>}

        <div className="field" style={{ marginTop: 16 }}>
          <label>{t('Reason')} {ask.reasonRequired ? '' : <span className="muted">{t('(optional)')}</span>}</label>
          <input
            ref={input}
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={ask.danger ? t('Spam, wrong price, duplicate…') : t('Checked the licence')}
            onKeyDown={(e) => { if (e.key === 'Enter' && !blocked) { ask.onConfirm(reason.trim()); onClose(); } }}
          />
          <span className="tiny muted">{t('Goes into the admin log next to your name.')}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
          <button className="btn btn--ghost" onClick={onClose}>{t('Cancel')}</button>
          <button
            className={`btn ${ask.danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={blocked}
            onClick={() => { ask.onConfirm(reason.trim()); onClose(); }}
          >
            <Icon name={ask.danger ? 'close' : 'check'} size={16} /> {ask.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
