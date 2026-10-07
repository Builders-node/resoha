import type { cookies } from 'next/headers';

/**
 * Кілька акаунтів в одному браузері (як в Instagram). Активний акаунт живе у звичайних
 * кукі Supabase, а решта — тут: id, підпис для меню й refresh-токен їхньої сесії.
 * Кука httpOnly, тож токени не бачить JavaScript сторінки — так само, як і сесію Supabase.
 *
 * Токен неактивного акаунта ніхто не оновлює, тому він лишається свіжим, доки ним
 * не скористаються при перемиканні. Токен активного сюди не пишемо: middleware його
 * весь час ротує, і збережена копія швидко стала б використаною.
 */
export type StoredAccount = { id: string; name: string; email: string; avatar: string; rt: string };
export type AccountChip = Omit<StoredAccount, 'rt'>;

type Store = Awaited<ReturnType<typeof cookies>>;

const COOKIE = 'resoha_accounts';
const MAX = 5;

export function readAccounts(store: Store): StoredAccount[] {
  const raw = store.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return Array.isArray(list) ? list.filter((a) => a?.id && a?.rt) : [];
  } catch {
    return [];
  }
}

export function writeAccounts(store: Store, list: StoredAccount[]) {
  if (!list.length) { store.delete(COOKIE); return; }
  store.set(COOKIE, Buffer.from(JSON.stringify(list.slice(0, MAX))).toString('base64url'), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
}

/** Додати/оновити акаунт у списку: свіжий — нагору, без дублів. */
export const upsertAccount = (list: StoredAccount[], a: StoredAccount) =>
  [a, ...list.filter((x) => x.id !== a.id)];

export const chip = ({ id, name, email, avatar }: StoredAccount): AccountChip => ({ id, name, email, avatar });

/**
 * Прибрати сесію Supabase лише з цього браузера, не відкликаючи її на сервері.
 * supabase.auth.signOut() (навіть scope 'local') відкликає refresh-токен, а нам
 * треба, щоб відкладений акаунт лишився робочим.
 */
export function dropSessionCookies(store: Store) {
  for (const c of store.getAll()) {
    if (/^sb-.+-auth-token(\.\d+)?$/.test(c.name)) store.delete(c.name);
  }
}
