'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import Icon from './Icon';
import { toast } from './Toaster';
import { openAuth } from '@/lib/auth-modal';
import type { AccountChip } from '@/lib/accounts';

/**
 * Інші акаунти цього браузера + «Add account». Той самий список і в меню «Me»
 * на десктопі, і в листі «Other» на телефоні.
 */
export default function AccountSwitcher({ onDone, showAdd = true }: {
  onDone?: () => void;
  showAdd?: boolean;    // у вікні входу «Add account» зайвий — там і так входять в інший
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountChip[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch('/api/auth/accounts').then((r) => r.json()).catch(() => ({}));
    setAccounts(d.accounts ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: object) {
    setBusy(true);
    const res = await fetch('/api/auth/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setBusy(false);
    return res;
  }

  async function switchTo(a: AccountChip) {
    const res = await post({ action: 'switch', id: a.id });
    onDone?.();
    if (!res.ok) {
      toast((await res.json()).error ?? 'Could not switch');
      load();
      return;
    }
    toast(`Switched to ${a.name || a.email}`);
    // лишаємось на тій самій сторінці — вона перемалюється під новий акаунт
    router.refresh();
  }

  async function add() {
    await post({ action: 'add' });
    onDone?.();
    router.refresh();
    openAuth('login');
  }

  if (!showAdd && !accounts.length) return null;

  return (
    <div className="acc-list">
      {!showAdd && <div className="tiny muted" style={{ fontWeight: 700 }}>Continue as</div>}
      {accounts.map((a) => (
        <button key={a.id} type="button" className="acc-item" disabled={busy} onClick={() => switchTo(a)}>
          <Avatar src={a.avatar} name={a.name} className="acc-item__ava" />
          <span className="acc-item__text">
            <b>{a.name || a.email}</b>
            <span className="tiny muted">{a.email}</span>
          </span>
        </button>
      ))}
      {showAdd && (
        <button type="button" className="acc-item" disabled={busy} onClick={add}>
          <span className="acc-item__ava acc-item__plus"><Icon name="plus" size={16} /></span>
          <span className="acc-item__text"><b>Add account</b></span>
        </button>
      )}
    </div>
  );
}
