'use client';
import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { LANG_COOKIE } from '@/lib/i18n';
import { isLocalizedPath, localePath, stripLang } from '@/lib/i18n/paths';
import { useLang } from './LangProvider';

const HIDE_KEY = 'langHintHidden';

const subscribe = () => () => {};
/** Обрав іспанську (кукі з перемикача чи /es-адреси) і не закрив підказку в цій вкладці. */
function wantsEs() {
  if (!document.cookie.split('; ').includes(`${LANG_COOKIE}=es`)) return false;
  try { return sessionStorage.getItem(HIDE_KEY) !== '1'; } catch { return true; }
}

/**
 * Хто обрав іспанську, але відкрив адресу без /es (стара закладка, лист, посилання ззовні),
 * бачить пропозицію перейти на іспанську версію. Перенаправляти за кукі не можна: тоді
 * одна адреса віддавала б різні сторінки, і пошуковики плутали б canonical.
 * Рішення лише в браузері, тож серверна сторінка однакова для всіх і кешується.
 */
export default function LangHint() {
  const lang = useLang();
  const pathname = usePathname();
  const wants = useSyncExternalStore(subscribe, wantsEs, () => false);
  const [closed, setClosed] = useState(false);

  if (lang !== 'en' || !wants || closed || stripLang(pathname).lang || !isLocalizedPath(pathname)) return null;
  const href = localePath('es', pathname);
  const hide = () => {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* приватний режим */ }
    setClosed(true);
  };
  return (
    <div className="langhint" lang="es" role="region" aria-label="Idioma">
      {/* фільтри з адреси (?deal=sale) зберігаємо — беремо їх у момент кліку */}
      <a href={href} onClick={(e) => { e.preventDefault(); window.location.assign(href + window.location.search + window.location.hash); }}>
        Ver en español
      </a>
      <button type="button" onClick={hide} aria-label="Cerrar">×</button>
    </div>
  );
}
