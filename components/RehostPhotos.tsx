'use client';
import { useState } from 'react';

/** Кнопка в адмінці: переносить фото з чужих серверів і AVIF у наш Storage, порція за порцією */
export default function RehostPhotos() {
  const [state, setState] = useState<{ running: boolean; moved: number; listings: number; failed: string[]; left: number | null; error: string }>(
    { running: false, moved: 0, listings: 0, failed: [], left: null, error: '' });

  async function run() {
    let moved = 0, listings = 0, failed: string[] = [];
    setState({ running: true, moved, listings, failed, left: null, error: '' });
    for (let i = 0; i < 200; i++) {
      const res = await fetch('/api/admin/photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: failed }),
      }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) { setState((s) => ({ ...s, running: false, error: d?.error ?? 'Request failed' })); return; }
      moved += d.moved; listings += d.listings; failed = [...failed, ...d.failed];
      setState({ running: true, moved, listings, failed, left: d.left, error: '' });
      if (!d.left || (!d.moved && !d.failed.length)) break;
    }
    setState((s) => ({ ...s, running: false }));
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 6 }}>Photos on other servers</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Copies imported photos from agency websites, and AVIF files, into our storage as JPEG (cover) and WebP.
        Originals are left untouched; listings switch to the new links. Safe to run again.
      </p>
      <button type="button" className="btn btn--primary btn--sm" onClick={run} disabled={state.running}>
        {state.running ? 'Moving…' : 'Move photos to storage'}
      </button>
      {(state.moved > 0 || state.left !== null) && (
        <p className="small" style={{ marginBottom: 0 }}>
          Moved <b>{state.moved}</b> photos in <b>{state.listings}</b> listing updates
          {state.left !== null && <> · <b>{state.left}</b> left</>}
          {state.failed.length > 0 && <> · <b>{state.failed.length}</b> could not be downloaded (left as they were)</>}
        </p>
      )}
      {state.error && <p className="small" style={{ color: 'var(--orange)' }}>{state.error}</p>}
    </div>
  );
}
