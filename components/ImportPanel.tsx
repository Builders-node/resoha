'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { parseCsv } from '@/lib/csv';
import { fmtUsd } from '@/lib/format';
import {
  CSV_TEMPLATE, IMPORT_CHUNK, planImport, rowsFromKyero, rowsFromTable,
  type ImportPlan, type ImportRow, type ImportedListing,
} from '@/lib/listingImport';

type Source = 'csv' | 'feed';
type Kind = ImportPlan['kind'];
type Result = { line: number; externalId: string; ok: boolean; action: Kind; review?: string; error?: string };

const FEED_KEY = 'resoha:import-feed';
const KIND_LABEL: Record<Kind, string> = { new: 'New', update: 'Updated', same: 'Unchanged', error: 'Error' };
const KIND_PILL: Record<Kind, string> = { new: 'pill--on', update: 'pill--warn', same: 'pill--off', error: 'imp-pill--err' };
const FIELD_LABEL: Record<string, string> = {
  title: 'title', deal: 'deal', type: 'type', price: 'price', beds: 'beds', baths: 'baths', sqft: 'area',
  lotAcres: 'lot', year: 'year', hoa: 'HOA', neighborhood: 'area name', address: 'address', lat: 'pin', lng: 'pin',
  text: 'description', photos: 'photos', oceanfront: 'oceanfront', tags: 'features', sourceUrl: 'link',
};

/** Файл фіда може бути не в UTF-8: кодування беремо з XML-декларації */
function decodeXml(buf: ArrayBuffer) {
  const head = new TextDecoder('latin1').decode(buf.slice(0, 200));
  const enc = head.match(/encoding=["']([\w-]+)["']/i)?.[1] ?? 'utf-8';
  try { return new TextDecoder(enc).decode(buf); } catch { return new TextDecoder().decode(buf); }
}

/**
 * Імпорт оголошень агенції: CSV або фід Kyero v3 (посилання чи файл).
 * Спершу попередній перегляд — нові / оновлені / без змін / помилки, — потім запис
 * порціями через звичайне збереження оголошення (модерація й пошук дублів працюють).
 */
export default function ImportPanel({ onDone }: { onDone: () => void }) {
  const [source, setSource] = useState<Source>('csv');
  // кабінет рендериться лише в браузері (спершу «Loading dashboard…»), тож localStorage тут доступний
  const [feedUrl, setFeedUrl] = useState(() => {
    try { return typeof window === 'undefined' ? '' : localStorage.getItem(FEED_KEY) ?? ''; } catch { return ''; }
  });
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<ImportedListing[] | null>(null);
  const [setupError, setSetupError] = useState('');
  const [loaded, setLoaded] = useState<{ name: string; rows: ImportRow[]; full: boolean; note?: string } | null>(null);
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const [unpublish, setUnpublish] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadExisting = () => fetch('/api/listings/import')
    .then(async (res) => {
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setSetupError(d.error ?? 'Import is not available');
      else setExisting(d.existing);
    })
    .catch(() => setSetupError('Import is not available'));
  useEffect(() => { loadExisting(); }, []);

  const plans = useMemo(() => (loaded && existing ? planImport(loaded.rows, existing) : []), [loaded, existing]);
  const counts = useMemo(() => {
    const c: Record<Kind, number> = { new: 0, update: 0, same: 0, error: 0 };
    for (const p of plans) c[p.kind]++;
    return c;
  }, [plans]);
  // фід — повний список агенції: чого в ньому немає, те, мабуть, продано або знято
  const missing = useMemo(() => {
    if (!loaded?.full || !existing) return [];
    const refs = new Set(loaded.rows.map((r) => r.externalId));
    return existing.filter((e) => e.active && !refs.has(e.externalId));
  }, [loaded, existing]);

  function showRows(name: string, rows: ImportRow[], full: boolean, note?: string) {
    setResults(null); setFilter('all'); setUnpublish(false);
    if (!rows.length) { setLoaded(null); return toast('No listings found in this file'); }
    setLoaded({ name, rows, full, note });
  }

  function readXml(text: string, name: string) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return toast('This is not a valid XML file');
    const { rows, currencyErrors } = rowsFromKyero(doc);
    showRows(name, rows, true, currencyErrors ? `${currencyErrors} listings are priced in another currency — only USD prices are imported.` : undefined);
  }

  async function pickFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      if (/\.xml$/i.test(file.name)) return readXml(decodeXml(buf), file.name);
      const { rows, columns } = rowsFromTable(parseCsv(new TextDecoder().decode(buf)));
      if (!columns.includes('externalId')) return toast('The CSV needs an external_id (or ref / reference) column');
      showRows(file.name, rows, false);
    } catch (e) {
      toast(`Could not read ${file.name}: ${(e as Error).message}`);
    }
  }

  async function loadFeed() {
    const url = feedUrl.trim();
    if (!/^https?:\/\//i.test(url)) return toast('Paste the full link to the feed, starting with https://');
    try { localStorage.setItem(FEED_KEY, url); } catch { /* приватне вікно */ }
    setBusy(true);
    const res = await fetch(`/api/listings/import/feed?url=${encodeURIComponent(url)}`).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      const d = await res?.json().catch(() => ({}));
      return toast(d?.error ?? 'Could not download the feed');
    }
    const text = decodeXml(await res.arrayBuffer());
    setBusy(false);
    readXml(text, new URL(url).hostname);
  }

  async function apply() {
    if (!loaded) return;
    const todo = plans.filter((p) => p.kind === 'new' || p.kind === 'update').map((p) => p.row as ImportRow);
    if (!todo.length && !(unpublish && missing.length)) return;
    setBusy(true); setResults(null);
    const out: Result[] = [];
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += IMPORT_CHUNK) {
      const chunk = todo.slice(i, i + IMPORT_CHUNK);
      const res = await fetch('/api/listings/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', rows: chunk }),
      }).catch(() => null);
      const d = await res?.json().catch(() => ({}));
      if (!res?.ok) {
        out.push(...chunk.map((r) => ({ line: r.line, externalId: r.externalId, ok: false, action: 'error' as const, error: d?.error ?? 'Request failed' })));
      } else out.push(...d.results);
      setProgress({ done: Math.min(todo.length, i + chunk.length), total: todo.length });
    }
    let unpublished = 0;
    if (unpublish && missing.length) {
      const res = await fetch('/api/listings/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish', ids: missing.map((m) => m.id) }),
      });
      unpublished = (await res.json().catch(() => ({}))).unpublished ?? 0;
    }
    setBusy(false); setProgress(null); setResults(out);
    const ok = out.filter((r) => r.ok);
    toast(`Import finished: ${ok.filter((r) => r.action === 'new').length} new, ${ok.filter((r) => r.action === 'update').length} updated`
      + (unpublished ? `, ${unpublished} unpublished` : ''));
    await loadExisting();
    onDone();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'resoha-listings-template.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (setupError) return <div className="panel"><h3>Import listings</h3><p className="muted">{setupError}</p></div>;

  const shown = plans.filter((p) => filter === 'all' || p.kind === filter).slice(0, 500);
  const pending = counts.new + counts.update;
  const failed = results?.filter((r) => !r.ok) ?? [];
  const sentForReview = results?.filter((r) => r.ok && r.action === 'new' && r.review === 'pending').length ?? 0;

  return (
    <div className="panel imp">
      <h3 style={{ marginBottom: 4 }}>Import listings</h3>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Load your listings from a CSV export or a Kyero v3 XML feed. Each listing is matched by its reference
        (external ID): new references become new listings, known ones are updated. Run it again any time — nothing is duplicated.
        {existing && existing.length > 0 && ` You have ${existing.length} imported listings.`}
      </p>

      <div className="chip-row" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip-btn ${source === 'csv' ? 'is-on' : ''}`} onClick={() => setSource('csv')}>CSV or XML file</button>
        <button type="button" className={`chip-btn ${source === 'feed' ? 'is-on' : ''}`} onClick={() => setSource('feed')}>Feed link (Kyero XML)</button>
      </div>

      {source === 'csv' ? (
        <div className="imp-source">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => fileInput.current?.click()}>
            <Icon name="plus" size={16} /> Choose file
          </button>
          <button type="button" className="link-btn small" onClick={downloadTemplate}>
            <Icon name="download" size={14} /> CSV template
          </button>
          <input ref={fileInput} type="file" hidden accept=".csv,.xml,text/csv,text/xml,application/xml"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
          <span className="tiny muted" style={{ flexBasis: '100%' }}>
            CSV columns: external_id, title, deal (sale / rent), type (condo, house, land, commercial), price, beds, baths,
            m2 or sqft, lot_acres, neighborhood, address, latitude, longitude, description, photos (links separated by |).
            Empty cells leave the current value alone.
          </span>
        </div>
      ) : (
        <div className="imp-source">
          <input className="input" type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://your-crm.com/feeds/kyero.xml" style={{ flex: 1, minWidth: 220 }} />
          <button type="button" className="btn" disabled={busy || !feedUrl.trim()} onClick={loadFeed}>
            {busy && !progress ? 'Loading…' : 'Load feed'}
          </button>
          <span className="tiny muted" style={{ flexBasis: '100%' }}>
            Kyero v3 format (most CRMs export it). Prices must be in USD. Photos stay on your server and are shown from the feed links.
          </span>
        </div>
      )}

      {loaded && existing && (
        <div className="imp-preview">
          <div className="imp-sum">
            <b className="small">{loaded.name}</b>
            {(['all', 'new', 'update', 'same', 'error'] as const).map((k) => (
              <button key={k} type="button" className={`chip-btn ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>
                {k === 'all' ? `All ${plans.length}` : `${KIND_LABEL[k]} ${counts[k]}`}
              </button>
            ))}
          </div>
          {loaded.note && <p className="small imp-warn">{loaded.note}</p>}

          <div className="imp-table-wrap">
            <table className="table imp-table">
              <thead><tr><th>Ref</th><th>Listing</th><th>Price</th><th>Result</th></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={`${p.row.line}-${p.row.externalId}`}>
                    <td className="tiny">{p.row.externalId || `row ${p.row.line}`}</td>
                    <td>
                      <div className="imp-title">{p.row.title || '—'}</div>
                      <div className="tiny muted">
                        {[p.row.neighborhood, p.row.type, p.row.deal, p.row.photos && `${p.row.photos.length} photos`].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="small">{p.row.price ? fmtUsd(p.row.price) : '—'}</td>
                    <td>
                      <span className={`pill ${KIND_PILL[p.kind]}`}>{KIND_LABEL[p.kind]}</span>
                      {p.kind === 'update' && (
                        <div className="tiny muted">{[...new Set(p.fields.map((f) => FIELD_LABEL[f]))].join(', ')}</div>
                      )}
                      {p.kind === 'error' && <div className="tiny imp-err">{p.message}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {missing.length > 0 && (
            <label className="imp-check small">
              <input type="checkbox" checked={unpublish} onChange={(e) => setUnpublish(e.target.checked)} />
              Unpublish {missing.length} imported {missing.length === 1 ? 'listing that is' : 'listings that are'} no longer in this feed
            </label>
          )}

          <p className="tiny muted">
            New listings go through the usual check: verified agents publish straight away, others after a quick review.
            Rows with errors are skipped.
          </p>
          <div className="chip-row">
            <button type="button" className="btn btn--primary" disabled={busy || (!pending && !(unpublish && missing.length))} onClick={apply}>
              {progress ? `Saving ${progress.done} of ${progress.total}…`
                : pending ? `Import ${pending} ${pending === 1 ? 'listing' : 'listings'}` : unpublish && missing.length ? 'Unpublish' : 'Nothing to import'}
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setLoaded(null); setResults(null); }}>Clear</button>
          </div>
          {progress && (
            <div className="imp-bar" role="progressbar" aria-valuenow={progress.done} aria-valuemax={progress.total}>
              <span style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 100}%` }} />
            </div>
          )}
        </div>
      )}

      {results && (
        <div className="imp-result">
          <p className="small">
            <b>Done.</b> {results.filter((r) => r.ok && r.action === 'new').length} created
            {sentForReview > 0 && ` (${sentForReview} waiting for review)`}, {results.filter((r) => r.ok && r.action === 'update').length} updated
            {failed.length > 0 && `, ${failed.length} failed`}.
          </p>
          {failed.length > 0 && (
            <ul className="imp-errors small">
              {failed.slice(0, 100).map((r, i) => <li key={i}><b>{r.externalId || `row ${r.line}`}</b>: {r.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
