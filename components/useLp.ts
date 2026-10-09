'use client';
import { useCallback } from 'react';
import { localePath } from '@/lib/i18n/paths';
import { useLang } from './LangProvider';

/** Клієнтський двійник getLp: на іспанській публічні посилання ведуть на /es/... */
export function useLp() {
  const lang = useLang();
  return useCallback((href: string) => localePath(lang, href), [lang]);
}
