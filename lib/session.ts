import { getAgency, mapAgent } from './db';
import { supabaseServer } from './supabase/server';
import type { Agency, Agent, Session } from './types';

/** Профіль поточного користувача з Supabase (null — не залогінений). */
export async function currentUser(): Promise<Agent | null> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from('profiles').select('*, agency:agencies!profiles_agency_id_fkey(name)').eq('id', auth.user.id).maybeSingle();
  return data ? mapAgent(data) : null;
}

export const toSession = (u: Agent): Session => ({
  id: u.id, role: u.role, name: u.name, avatar: u.avatar,
  agencyId: u.agencyId, isOwner: u.isOwner,
});

export async function getSession(): Promise<Session | null> {
  const u = await currentUser();
  return u ? toSession(u) : null;
}

/** Користувач + його агенція одним викликом — часто потрібні разом. */
export async function currentUserWithAgency(): Promise<{ user: Agent | null; agency: Agency | null }> {
  const user = await currentUser();
  return { user, agency: user ? await getAgency(user.agencyId) : null };
}
