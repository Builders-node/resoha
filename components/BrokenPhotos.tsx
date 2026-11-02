'use client';
import { useState } from 'react';
import type { CheckResult } from '@/lib/photoCheck';

/**
 * Кнопка в адмінці: перевіряє всі фото з чужих сайтів (оголошення, ЖК, логотипи забудовників)
 * і показує ті, що вже не відкриваються. Биті можна одним кліком прибрати з бази.
 */
export default function BrokenPhotos() {
  const [s, setS] = useState<{ running: boolean; done: number; total: number | null; bad: CheckResult[]; error: string; pruned: number | null }>(
    { running: false, done: 0, total: null, bad: [], error: '', pruned: null });

  async function post(body: object) {
    const res = await fetch('/api/admin/photos/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) throw new Error(d?.error ?? 'Request failed');
    return d;
  }

  async function run() {
    let offset: number | null = 0;
    let bad: CheckResult[] = [];
    setS({ running: true, done: 0, total: null, bad, error: '', pruned: null });
    try {
      while (offset !== null) {
        const d: { total: number; next: number | null; bad: CheckResult[] } = await post({ offset });
        bad = [...bad, ...d.bad];
        offset = d.next;
        setS((x) => ({ ...x, done: d.next ?? d.total, total: d.total, bad }));
      }
    } catch (e) {
      setS((x) => ({ ...x, error: (e as Error).message }));
    }
    setS((x) => ({ ...x, running: false }));
  }

  async function prune() {
    const urls = s.bad.filter((b) => b.status === 'dead').map((b) => b.url);
    if (!urls.length || !confirm(`Remove ${urls.length} broken photo links from the site?`)) return;
    setS((x) => ({ ...x, running: true, error: '' }));
    try {
      const d = await post({ prune: urls });
      setS((x) => ({ ...x, running: false, pruned: d.rows, bad: x.bad.filter((b) => b.status !== 'dead') }));
    } catch (e) {
      setS((x) => ({ ...x, running: false, error: (e as Error).message }));
    }
  }

  const dead = s.bad.filter((b) => b.status === 'dead');
  const flaky = s.bad.filter((b) => b.status === 'flaky');

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 6 }}>Broken photos</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Checks every photo hosted on other websites (agency imports, developer sites, developer logos) and lists the ones
        that no longer open. Our own storage is not affected. The site already hides a broken photo; removing the link
        also takes it out of galleries and counts.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={run} disabled={s.running}>
          {s.running && s.total !== null ? `Checking… ${s.done} / ${s.total}` : s.running ? 'Checking…' : 'Find broken photos'}
        </button>
        {!s.running && dead.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={prune}>Remove {dead.length} broken links</button>
        )}
      </div>
      {s.total !== null && !s.running && (
        <p className="small" style={{ marginBottom: 0 }}>
          Checked <b>{s.total}</b> links · <b>{dead.length}</b> broken
          {flaky.length > 0 && <> · <b>{flaky.length}</b> did not answer (try again later)</>}
          {s.pruned !== null && <> · removed from <b>{s.pruned}</b> records</>}
        </p>
      )}
      {s.bad.length > 0 && (
        <ul className="small" style={{ maxHeight: 320, overflow: 'auto', paddingLeft: 18, wordBreak: 'break-all' }}>
          {s.bad.map((b) => (
            <li key={b.url} style={{ marginBottom: 6 }}>
              <b>{b.status === 'dead' ? 'Broken' : 'No answer'}</b> ({b.reason}) — {b.refs.map((r) => r.label).join(', ')}
              <br /><a href={b.url} target="_blank" rel="noreferrer" className="muted">{b.url}</a>
            </li>
          ))}
        </ul>
      )}
      {s.error && <p className="small" style={{ color: 'var(--orange)' }}>{s.error}</p>}
    </div>
  );
}
