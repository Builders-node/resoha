import { NextResponse } from 'next/server';

/**
 * Перевірка конфігурації середовища. Значень не віддає — лише імена змінних
 * і чи вони видимі рантайму, щоб ловити помилки в назвах і в scope на Vercel.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // імена всіх змінних, що згадують Supabase, — щоб побачити друкарську помилку в назві
  const seen = Object.keys(process.env)
    .filter((k) => /SUPABASE/i.test(k))
    .sort();

  return NextResponse.json({
    ok: Boolean(url && key),
    env: process.env.VERCEL_ENV ?? 'local',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    NEXT_PUBLIC_SUPABASE_URL: url ? new URL(url).host : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? `set (${key.length} chars, starts “${key.slice(0, 3)}”)` : null,
    supabaseVarNamesVisible: seen,
  });
}
