'use client';
import { useEffect, useState } from 'react';
import { toast } from './Toaster';
import { embedPath, embedSnippet, type EmbedView } from '@/lib/embed';
import type { Development } from '@/lib/types';

/**
 * Код віджета ЖК для сайту забудовника: шахматка чи список квартир із формою заявки.
 * ЖК — свої (ріелтора чи агенції) і ті, що привʼязані до профілів компанії.
 */
export default function EmbedSnippets({ companyIds }: { companyIds: string[] }) {
  const [devs, setDevs] = useState<Development[] | null>(null);
  const [slug, setSlug] = useState('');
  const [view, setView] = useState<EmbedView | ''>('');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [form, setForm] = useState(true);
  const ids = companyIds.join(',');

  useEffect(() => {
    const get = (q: string) => fetch(`/api/developments${q}`).then((r) => r.json()).then((d) => (d.items ?? []) as Development[]).catch(() => []);
    Promise.all([get('?mine=1'), ids ? get('') : Promise.resolve([])]).then(([mine, all]) => {
      const linked = all.filter((d) => d.developerId && ids.split(',').includes(d.developerId));
      const seen = new Set<string>();
      const list = [...mine, ...linked].filter((d) => !seen.has(d.id) && seen.add(d.id));
      setDevs(list);
      setSlug((s) => s || list[0]?.slug || '');
    });
  }, [ids]);

  // devs є лише після запиту в браузері, тож window тут уже доступний
  if (devs === null) return null;
  const origin = window.location.origin;

  const dev = devs.find((d) => d.slug === slug);
  const opts = { view: view || undefined, lang, form };
  const code = dev ? embedSnippet(origin, dev.slug, `${dev.name} — availability`, opts) : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast('Code copied — paste it into your website');
    } catch {
      toast('Select the code and copy it manually');
    }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Widget for your website</h3>
      <p className="muted small" style={{ margin: '4px 0 10px' }}>
        Show live unit availability — a floor-by-floor grid or a list with prices — on your own site.
        Enquiries from the widget arrive in your Resoha leads marked “Website widget”. The frame resizes itself to fit.
      </p>
      {!devs.length ? (
        <p className="small muted">No developments yet. Add a development (or link one to your company) to get its widget code.</p>
      ) : (
        <div className="embed-snip">
          <div className="embed-snip__opts">
            <label>Development
              <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
                {devs.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}
              </select>
            </label>
            <label>Layout
              <select className="input" value={view} onChange={(e) => setView(e.target.value as EmbedView | '')}>
                <option value="">Grid by floor (list if no floors)</option>
                <option value="list">Unit list</option>
              </select>
            </label>
            <label>Language
              <select className="input" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          </div>
          <label className="small" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form} onChange={(e) => setForm(e.target.checked)} /> Include the enquiry form
          </label>
          <textarea className="input" readOnly value={code} onFocus={(e) => e.currentTarget.select()} aria-label="Widget code" />
          <div className="chip-row">
            <button type="button" className="btn btn--primary btn--sm" onClick={copy} disabled={!code}>Copy code</button>
            {dev && <a className="btn btn--ghost btn--sm" href={embedPath(dev.slug, opts)} target="_blank" rel="noopener">Preview</a>}
          </div>
          <p className="tiny muted">Paste the code where the widget should appear, e.g. in an HTML / “Custom code” block of your site builder.</p>
        </div>
      )}
    </div>
  );
}
