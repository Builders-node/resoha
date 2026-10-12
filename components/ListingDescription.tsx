import type { Lang, T } from '@/lib/i18n';

/** Google Translate у новій вкладці — без платного API; довгий текст ріжемо, бо URL має межу. */
export const googleTranslateUrl = (text: string, from: Lang, to: Lang) =>
  `https://translate.google.com/?sl=${from}&tl=${to}&op=translate&text=${encodeURIComponent(text.slice(0, 4500))}`;

/**
 * Опис оголошення: іспаномовним — body_es, якщо ріелтор його заповнив; інакше англійський
 * текст із приміткою й посиланням на Google Translate. Машинного перекладу самі не робимо.
 */
export default function ListingDescription({ text, textEs, lang, t }: { text: string; textEs: string; lang: Lang; t: T }) {
  const es = textEs.trim();
  const en = text.trim();
  const wantEs = lang === 'es';
  const shown = wantEs ? es || en : en || es;
  const shownLang: Lang = shown === es && es ? 'es' : 'en';
  const foreign = shownLang !== lang;
  return (
    <div className="ldesc">
      <p className="muted ldesc__text" lang={shownLang} style={{ fontSize: 15 }}>{shown}</p>
      {foreign && (
        <p className="tiny muted ldesc__note">
          {shownLang === 'en'
            ? t('The agent wrote this description in English.')
            : t('The agent wrote this description in Spanish.')}{' '}
          <a href={googleTranslateUrl(shown, shownLang, lang)} target="_blank" rel="noopener noreferrer nofollow">
            {t('Translate with Google')}
          </a>
        </p>
      )}
    </div>
  );
}
