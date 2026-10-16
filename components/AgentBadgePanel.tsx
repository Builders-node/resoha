'use client';
import { useState } from 'react';
import CopyBox from './CopyBox';

/**
 * Бейдж «Агент місяця» в кабінеті: картинка для сторіс і код для власного сайту ріелтора.
 * Бейдж сам показує місце в рейтингу за минулий місяць або «Agente en Hogarli», якщо поза топом.
 */
export default function AgentBadgePanel({ agentId }: { agentId: string }) {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const profile = `${origin}${lang === 'es' ? '/es' : ''}/agents/${agentId}`;
  const badge = `${origin}/api/agents/${agentId}/badge?lang=${lang}`;
  const story = `/api/agents/${agentId}/story?lang=${lang}`;
  const alt = lang === 'es' ? 'Agente en Hogarli' : 'Agent on Hogarli';
  const code = `<a href="${profile}" target="_blank" rel="noopener"><img src="${badge}" alt="${alt}" width="240" height="72"></a>`;

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Your Hogarli badge</h3>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>
        Every month Hogarli ranks agents by listing quality, reply speed and reviews. The top 3 get a
        “Top agent” badge for the month; everyone else gets an “Agent on Hogarli” badge. Share the story image on
        Instagram or WhatsApp and put the badge on your website: it updates itself each month.
        {' '}<a className="link-accent" href="/agents/top" target="_blank" rel="noopener">See the ranking</a>
      </p>
      <div className="badge-panel">
        <div className="badge-panel__preview">
          <img src={`/api/agents/${agentId}/badge?lang=${lang}`} alt={alt} width={240} height={72} />
          <div className="chip-row">
            <button type="button" className={`chip-btn ${lang === 'es' ? 'is-on' : ''}`} onClick={() => setLang('es')}>Español</button>
            <button type="button" className={`chip-btn ${lang === 'en' ? 'is-on' : ''}`} onClick={() => setLang('en')}>English</button>
          </div>
          <a className="btn btn--primary" href={story} download={`hogarli-story-${lang}.png`}>Download story image</a>
        </div>
        <div style={{ minWidth: 0 }}>
          <label className="small"><b>Code for your website</b></label>
          {origin && <CopyBox text={code} rows={4} label="Copy code" done="Code copied — paste it into your website" />}
        </div>
      </div>
    </div>
  );
}
