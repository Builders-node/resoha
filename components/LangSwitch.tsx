'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LANG_COOKIE, LANGS, type Lang } from '@/lib/i18n';
import { isLocalizedPath, localePath, stripLang } from '@/lib/i18n/paths';
import { useLang, useT } from './LangProvider';

const NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

const saveLang = (l: Lang) => {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
};

/**
 * Перемикач мови: пишемо вибір у кукі на рік. На публічній сторінці мова живе в адресі —
 * переходимо на /es-версію чи назад (повним завантаженням: root layout теж має змінити мову),
 * в кабінетах просто перерендерюємо сторінку на сервері.
 */
export default function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(next: Lang) {
    if (next === lang) return;
    saveLang(next);
    const { pathname, search, hash } = window.location;
    const { path } = stripLang(pathname);
    if (isLocalizedPath(path)) {
      const target = localePath(next, path);
      if (target !== pathname) return window.location.assign(target + search + hash);
    }
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
