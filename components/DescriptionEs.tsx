'use client';
import { useRef } from 'react';
import { googleTranslateUrl } from './ListingDescription';

/**
 * Поле «Description (Spanish)» у формі оголошення. Кнопка лише відкриває Google Translate
 * з англійським описом у новій вкладці — переклад ріелтор вставляє сам і за потреби править.
 */
export default function DescriptionEs({ defaultValue }: { defaultValue?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function openTranslate() {
    const en = ref.current?.form?.elements.namedItem('text');
    const text = en instanceof HTMLTextAreaElement ? en.value.trim() : '';
    if (!text) return;
    window.open(googleTranslateUrl(text, 'en', 'es'), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="field">
      <div className="desc-es__head">
        <label htmlFor="lf-text-es">Description in Spanish <span className="muted">(optional)</span></label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={openTranslate}
          title="Opens Google Translate with your English description in a new tab">
          Translate in Google ↗
        </button>
      </div>
      <textarea ref={ref} id="lf-text-es" className="input" name="textEs" rows={5} defaultValue={defaultValue} lang="es"
        placeholder="Descripción en español…" />
      <span className="tiny muted">
        Spanish-speaking visitors see this instead of the English description. Leave it empty and they see the English text with a note.
      </span>
    </div>
  );
}
