'use client';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';

/** Завантаження фото обʼєкта: файли одразу летять на /api/uploads, у формі лишаються URL. */
export default function PhotoUploader({
  value, onChange, max = 12,
}: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (value.length + list.length > max) return toast(`Up to ${max} photos per listing`);

    const fd = new FormData();
    list.forEach((f) => fd.append('files', f));
    setBusy(true);
    const res = await fetch('/api/uploads', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return toast(data.error ?? 'Upload failed');
    onChange([...value, ...data.urls]);
    toast(`${data.urls.length} ${data.urls.length === 1 ? 'photo' : 'photos'} uploaded`);
  }

  const remove = (url: string) => onChange(value.filter((u) => u !== url));
  const makeCover = (url: string) => onChange([url, ...value.filter((u) => u !== url)]);
  const move = (url: string, dir: -1 | 1) => {
    const i = value.indexOf(url);
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div
        className={`dropzone ${over ? 'is-over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
      >
        <Icon name="plus" size={22} />
        <div>
          <b>{busy ? 'Uploading…' : 'Drop photos here or click to choose'}</b>
          <div className="tiny muted">JPEG, PNG, WebP or AVIF · up to 8 MB each · first photo is the cover</div>
        </div>
        <input
          ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden
          onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {value.length > 0 && (
        <div className="shots">
          {value.map((url, i) => (
            <figure key={url} className="shot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              {i === 0 && <span className="badge badge--brand shot__cover">Cover</span>}
              <div className="shot__bar">
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(url, -1)} disabled={i === 0} aria-label="Move left">←</button>
                {i !== 0 && <button type="button" className="btn btn--sm btn--ghost" onClick={() => makeCover(url)}>Cover</button>}
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(url, 1)} disabled={i === value.length - 1} aria-label="Move right">→</button>
                <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(url)}>Remove</button>
              </div>
            </figure>
          ))}
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {value.length
          ? `${value.length} of ${max} photos`
          : 'No photos yet — the listing will show a placeholder until you add some.'}
      </p>
    </div>
  );
}
