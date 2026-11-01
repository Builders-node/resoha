'use client';
import { useRef, useState } from 'react';
import { useLang, useT } from './LangProvider';
import { toast } from './Toaster';
import { assist, formFacts, setFieldValue, useAssistAvailable } from './useAssist';

/**
 * «Написать за меня»: чернетка опису з уже заповнених полів. Текст ріелтора, якщо він є,
 * іде як нотатки — модель його покращує, а не викидає. Без ключа на сервері кнопки немає.
 */
export default function DescriptionHelp({ extra }: { extra: Record<string, string> }) {
  const t = useT();
  const lang = useLang();
  const auto = useAssistAvailable();
  const ref = useRef<HTMLSpanElement>(null);
  const [busy, setBusy] = useState(false);
  if (!auto) return null;

  async function write() {
    const form = ref.current?.closest('form');
    const field = form?.elements.namedItem('text');
    if (!form || !(field instanceof HTMLTextAreaElement)) return;
    setBusy(true);
    const d = await assist({ mode: 'write', lang: lang === 'es' ? 'es' : 'en', facts: formFacts(form, extra), text: field.value });
    setBusy(false);
    if (!d.text) return toast(t(d.error ?? 'Something went wrong'));
    setFieldValue(field, d.text);
    toast(t('Draft written — check the facts and edit it to your voice'));
  }

  return (
    <span ref={ref} className="desc-help">
      <button type="button" className="btn btn--ghost btn--sm" onClick={write} disabled={busy}>
        {t(busy ? 'Writing…' : 'Write a draft from the details')}
      </button>
    </span>
  );
}
