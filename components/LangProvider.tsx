'use client';
import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LANG, makeT, type Lang, type T } from '@/lib/i18n';

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: DEFAULT_LANG, t: makeT(DEFAULT_LANG) });

/** Мову читає root layout з кукі й передає сюди, щоб клієнтські компоненти рендерились без миготіння. */
export default function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx).lang;
export const useT = () => useContext(Ctx).t;
