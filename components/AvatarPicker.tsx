'use client';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';

/** Завантаження аватара: той самий бакет, тека користувача, потім PATCH профілю. */
export default function AvatarPicker({
  src, name, onChanged,
}: { src: string; name: string; onChanged: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    const fd = new FormData();
    fd.append('files', file);
    setBusy(true);
    const up = await fetch('/api/uploads', { method: 'POST', body: fd });
    const data = await up.json().catch(() => ({}));
    if (!up.ok) { setBusy(false); return toast(data.error ?? 'Upload failed'); }

    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: data.urls[0] }),
    });
    setBusy(false);
    if (!res.ok) return toast('Could not save the photo');
    onChanged(data.urls[0]);
    toast('Profile photo updated');
  }

  return (
    <div className="avatar-pick">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} />
      <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="plus" size={15} /> {busy ? 'Uploading…' : 'Change photo'}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
    </div>
  );
}
