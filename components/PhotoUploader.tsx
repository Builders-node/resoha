'use client';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { uploadPhotos } from '@/lib/uploadPhotos';
import { ROOMS, type PhotoRooms, type RoomKey } from '@/lib/rooms';

/**
 * Завантаження фото обʼєкта: файли стискаються в браузері й одразу летять у Storage, у формі лишаються URL.
 * З rooms — під кожним фото вибір кімнати для фототуру на сторінці оголошення.
 * watermark — ледь помітний знак resoha на фото обʼєкта (не на лого й планах).
 * Порядок міняється перетягуванням або стрілками (на телефоні).
 */
export default function PhotoUploader({
  value, onChange, max = 50, rooms, onRoomsChange, watermark = false,
}: {
  value: string[]; onChange: (urls: string[]) => void; max?: number;
  rooms?: PhotoRooms; onRoomsChange?: (rooms: PhotoRooms) => void; watermark?: boolean;
}) {
  const [busy, setBusy] = useState('');
  const [over, setOver] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (value.length + list.length > max) return toast(`Up to ${max} photos per listing`);

    setBusy(list.length > 1 ? `Preparing 0 of ${list.length}…` : 'Preparing…');
    const data = await uploadPhotos(list, {
      watermark,
      onProgress: (stage, n) => setBusy(stage === 'upload' ? 'Uploading…' : list.length > 1 ? `Preparing ${n} of ${list.length}…` : 'Preparing…'),
    });
    setBusy('');

    if ('error' in data) return toast(data.error);
    onChange([...value, ...data.urls]);
    toast(`${data.urls.length} ${data.urls.length === 1 ? 'photo' : 'photos'} uploaded`);
  }

  /** Перетягнуте фото стає на місце того, над яким його відпустили */
  function dropOn(url: string) {
    if (!dragged || dragged === url) return;
    const next = value.filter((u) => u !== dragged);
    next.splice(next.indexOf(url) + (value.indexOf(dragged) < value.indexOf(url) ? 1 : 0), 0, dragged);
    onChange(next);
  }
  const isPhotoDrag = (e: React.DragEvent) => Boolean(dragged) && !e.dataTransfer.types.includes('Files');

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
          <b>{busy || 'Drop photos here or click to choose'}</b>
          <div className="tiny muted">JPEG, PNG, WebP or AVIF · resized in your browser before upload · first photo is the cover · drag to reorder</div>
        </div>
        <input
          ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden
          onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {value.length > 0 && (
        <div className="shots">
          {value.map((url, i) => (
            <figure key={url} className={`shot ${dragged === url ? 'is-dragged' : ''} ${target === url && dragged !== url ? 'is-target' : ''}`}
              draggable={value.length > 1}
              onDragStart={(e) => { setDragged(url); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', url); }}
              onDragEnd={() => { setDragged(null); setTarget(null); }}
              onDragOver={(e) => { if (!isPhotoDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTarget(url); }}
              onDragLeave={() => setTarget((t) => (t === url ? null : t))}
              onDrop={(e) => { if (!isPhotoDrag(e)) return; e.preventDefault(); dropOn(url); setDragged(null); setTarget(null); }}>
              <img src={url} alt="" draggable={false} />
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
