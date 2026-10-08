'use client';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { uploadPhotos } from '@/lib/uploadPhotos';
import { ROOMS, type PhotoRooms, type RoomKey } from '@/lib/rooms';

/**
 * Завантаження фото обʼєкта: файли одразу летять у Storage, у формі лишаються URL.
 * З rooms — під кожним фото вибір кімнати для фототуру на сторінці оголошення.
 */
export default function PhotoUploader({
  value, onChange, max = 12, rooms, onRoomsChange,
}: {
  value: string[]; onChange: (urls: string[]) => void; max?: number;
  rooms?: PhotoRooms; onRoomsChange?: (rooms: PhotoRooms) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (value.length + list.length > max) return toast(`Up to ${max} photos per listing`);

    setBusy(true);
    const data = await uploadPhotos(list);
    setBusy(false);

    if ('error' in data) return toast(data.error);
    onChange([...value, ...data.urls]);
    toast(`${data.urls.length} ${data.urls.length === 1 ? 'photo' : 'photos'} uploaded`);
  }

  const remove = (url: string) => onChange(value.filter((u) => u !== url));
  const setRoom = (url: string, room: string) => {
    if (!rooms || !onRoomsChange) return;
    const next = { ...rooms };
    if (room) next[url] = room as RoomKey; else delete next[url];
    onRoomsChange(next);
  };
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
              <img src={url} alt="" />
              {i === 0 && <span className="badge badge--brand shot__cover">Cover</span>}
              {rooms && (
                <select className={`shot__room ${rooms[url] ? 'is-set' : ''}`} value={rooms[url] ?? ''}
                  onChange={(e) => setRoom(url, e.target.value)} aria-label="Room in this photo">
                  <option value="">Room…</option>
                  {ROOMS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              )}
              <div className="shot__bar">
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(url, -1)} disabled={i === 0} aria-label="Move left">←</button>
                {i !== 0 && <button type="button" className="btn btn--sm btn--ghost" onClick={() => makeCover(url)}>Cover</button>}
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(url, 1)} disabled={i === value.length - 1} aria-label="Move right">→</button>
                <button type="button" className="btn btn--sm btn--danger btn--icon" title="Remove photo" aria-label="Remove photo" onClick={() => remove(url)}><Icon name="trash" size={16} /></button>
              </div>
            </figure>
          ))}
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {value.length
          ? `${value.length} of ${max} photos`
          : 'No photos yet — the listing will show a placeholder until you add some.'}
        {rooms && value.length > 0 && ' · Pick the room on each photo to build a photo tour on the listing page.'}
      </p>
    </div>
  );
}
