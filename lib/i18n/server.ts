import { cookies } from 'next/headers';
import { DEFAULT_LANG, isLang, LANG_COOKIE, makeT, type Lang } from './index';

/** Мова з кукі для серверних компонентів. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export async function getT() {
  return makeT(await getLang());
}
