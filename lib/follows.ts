import { supabaseServer } from './supabase/server';

/**
 * Підписки на оновлення ЖК (таблиця development_follows, міграція 0068).
 * Помилки (немає таблиці, мережа) — не привід ламати сторінку: тоді просто «не підписаний».
 */
export type FollowState = { on: boolean; count: number };

export async function followState(developmentId: string, userId: string | null): Promise<FollowState> {
  try {
    const client = await supabaseServer();
    const [{ data: count }, mine] = await Promise.all([
      client.rpc('development_followers', { p_development: developmentId }),
      userId
        ? client.from('development_follows').select('development_id')
          .eq('development_id', developmentId).eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return { on: !!mine.data, count: typeof count === 'number' ? count : 0 };
  } catch {
    return { on: false, count: 0 };
  }
}

export type FollowedDevelopment = {
  id: string; slug: string; name: string; neighborhood: string; photo: string; since: string;
};

/** ЖК, на які підписаний користувач, — для вкладки в кабінеті покупця. RLS віддає лише свої рядки. */
export async function listFollowed(): Promise<FollowedDevelopment[]> {
  const { data, error } = await (await supabaseServer()).from('development_follows')
    .select('created_at, developments(id, slug, name, neighborhood, photos, active)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Row = { created_at: string; developments: { id: string; slug: string; name: string; neighborhood: string | null; photos: string[] | null; active: boolean } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.developments?.active)
    .map((r) => ({
      id: r.developments!.id, slug: r.developments!.slug, name: r.developments!.name,
      neighborhood: r.developments!.neighborhood ?? '', photo: r.developments!.photos?.[0] ?? '', since: r.created_at,
    }));
}
