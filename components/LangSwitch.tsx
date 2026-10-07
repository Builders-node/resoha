'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LANG_COOKIE, LANGS, type Lang } from '@/lib/i18n';
import { useLang, useT } from './LangProvider';

const NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

const saveLang = (l: Lang) => {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
};

/** Перемикач мови: пишемо вибір у кукі на рік і перерендерюємо сторінку на сервері. */
export default function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(next: Lang) {
    if (next === lang) return;
    saveLang(next);
    start(() => router.refresh());
  }

  return (
    <div className={`langswitch ${className}`} role="group" aria-label={t('Language')} aria-busy={pending}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === lang}
          className={l === lang ? 'is-active' : ''} onClick={() => pick(l)}>
          {NAMES[l]}
        </button>
      ))}
    </div>
  );
}
