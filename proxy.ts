import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { LANG_HEADER, isLocalizedPath, localePath, stripLang } from '@/lib/i18n/paths';

// те саме імʼя, що LANG_COOKIE у lib/i18n: сам модуль не тягнемо, бо з ним їде весь словник
const LANG_COOKIE = 'lang';
const YEAR = 60 * 60 * 24 * 365;

/**
 * Мова в адресі. /es/... — переписуємо на звичайний маршрут з мовою es у заголовку й
 * запамʼятовуємо вибір у кукі. Публічна сторінка без префікса — завжди англійська,
 * а хто обрав іспанську, того ведемо на /es-версію: так посилання без префікса
 * (старі закладки, листи, клієнтська навігація) не викидають людину з іспанської.
 */
function langRoute(req: NextRequest): { redirect?: URL; rewrite?: URL; lang?: 'en' | 'es' } {
  const { pathname } = req.nextUrl;
  const { lang, path } = stripLang(pathname);
  const read = req.method === 'GET' || req.method === 'HEAD';

  if (lang === 'es') {
    const url = req.nextUrl.clone();
    url.pathname = path;
    // /es/admin і подібне іспанської версії не має — ведемо на звичайну адресу
    if (!isLocalizedPath(path)) return read ? { redirect: url } : {};
    return { rewrite: url, lang: 'es' };
  }
  if (!isLocalizedPath(pathname)) return {};
  if (read && req.cookies.get(LANG_COOKIE)?.value === 'es') {
    const url = req.nextUrl.clone();
    url.pathname = localePath('es', pathname);
    return { redirect: url };
  }
  return { lang: 'en' };
}

/** Оновлює токен Supabase у кукі, щоб сесія не протухала між запитами, і розводить мовні адреси. */
export async function proxy(req: NextRequest) {
  const route = langRoute(req);
  if (route.redirect) {
    const res = NextResponse.redirect(route.redirect, 307);
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  // заголовок мови ставить лише proxy — підроблений ззовні відкидаємо
  const headers = new Headers(req.headers);
  headers.delete(LANG_HEADER);
  if (route.lang) headers.set(LANG_HEADER, route.lang);
  const make = () => {
    const r = route.rewrite
      ? NextResponse.rewrite(route.rewrite, { request: { headers } })
      : NextResponse.next({ request: { headers } });
    if (route.lang === 'es' && req.cookies.get(LANG_COOKIE)?.value !== 'es') {
      r.cookies.set(LANG_COOKIE, 'es', { path: '/', maxAge: YEAR, sameSite: 'lax' });
    }
    return r;
  };
  let res = make();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Без змінних оточення не валимо весь сайт: пропускаємо запит далі й позначаємо
  // це заголовком, щоб /api/health міг показати, що саме не налаштоване.
  if (!url || !key) {
    res.headers.set('x-resoha-config', 'supabase-env-missing');
    return res;
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          headers.set('cookie', req.headers.get('cookie') ?? '');
          res = make();
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif)$).*)'],
};
