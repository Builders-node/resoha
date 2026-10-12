import { cookies, headers } from 'next/headers';
import { DEFAULT_LANG, isLang, LANG_COOKIE, makeT, type Lang } from './index';
import { LANG_HEADER, localePath } from './paths';

/**
 * Мова для серверних компонентів. На публічних сторінках її задає адреса (/es/... чи без
 * префікса) — proxy кладе її в заголовок; у кабінетах і API — кукі з перемикача.
 */
export async function getLang(): Promise<Lang> {
  const h = (await headers()).get(LANG_HEADER);
  if (isLang(h)) return h;
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export async function getT() {
  return makeT(await getLang());
}

/** Посилання з урахуванням мови сторінки: /listings → /es/listings на іспанській. */
export async function getLp() {
  const lang = await getLang();
  return (href: string) => localePath(lang, href);
}
