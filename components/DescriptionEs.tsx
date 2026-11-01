'use client';
import { useRef, useState } from 'react';
import { googleTranslateUrl } from './ListingDescription';
import { useT } from './LangProvider';
import { toast } from './Toaster';
import { assist, setFieldValue, useAssistAvailable } from './useAssist';

/**
 * Поле «Description (Spanish)» у формі оголошення. Кнопка лише відкриває Google Translate
 * з англійським описом у новій вкладці — переклад ріелтор вставляє сам і за потреби править.
 */
export default function DescriptionEs({ defaultValue }: { defaultValue?: string }) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);
  const auto = useAssistAvailable();
  const [busy, setBusy] = useState(false);

  async function translate() {
    const en = ref.current?.form?.elements.namedItem('text');
    const text = en instanceof HTMLTextAreaElement ? en.value.trim() : '';
    if (!text) return toast(t('Write the English description first'));
    if (ref.current?.value.trim() && !confirm(t('Replace the Spanish description with a new translation?'))) return;
    setBusy(true);
    const d = await assist({ mode: 'translate', to: 'es', text });
    setBusy(false);
    if (d.text && ref.current) setFieldValue(ref.current, d.text);
    else toast(t(d.error ?? 'Something went wrong'));
  }

  function openTranslate() {
    const en = ref.current?.form?.elements.namedItem('text');
    const text = en instanceof HTMLTextAreaElement ? en.value.trim() : '';
    if (!text) return;
    window.open(googleTranslateUrl(text, 'en', 'es'), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="field">
      <div className="desc-es__head">
        <label htmlFor="lf-text-es">{t('Description in Spanish')} <span className="muted">({t('optional')})</span></label>
        {auto ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={translate} disabled={busy}>
            {t(busy ? 'Translating…' : 'Translate from English')}
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={openTranslate}
            title={t('Opens Google Translate with your English description in a new tab')}>
            {t('Translate in Google ↗')}
          </button>
        )}
      </div>
      <textarea ref={ref} id="lf-text-es" className="input" name="textEs" rows={5} defaultValue={defaultValue} lang="es"
        placeholder={t('Descripción en español…')} />
      <span className="tiny muted">
        {t('Spanish-speaking visitors see this instead of the English description. Leave it empty and they see the English text with a note.')}
      </span>
    </div>
  );
}
