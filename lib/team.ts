import { supabaseServer } from './supabase/server';
import { isAgencyRole, type AgencyRole } from './teamRoles';
import { missingSchema } from './visitBookings';

/**
 * Ролі й запрошення в агенцію (міграція 0055). Усе — RPC від імені користувача;
 * хто що може, вирішує база (agency_can). До міграції ролей і запрошень немає — повертаємо порожнє.
 */

const NEEDS_UPDATE = 'This needs the latest database update';

/** Роль кожного члена команди */
export async function memberRoles(agencyId: string): Promise<Record<string, AgencyRole>> {
  const { data, error } = await (await supabaseServer()).from('agency_members')
    .select('profile_id, role, is_owner').eq('agency_id', agencyId);
  if (error) return {};
  return Object.fromEntries((data ?? []).map((m: { profile_id: string; role?: string; is_owner: boolean }) => [
    m.profile_id, m.is_owner ? 'owner' : isAgencyRole(m.role) ? m.role : 'agent',
  ]));
}

export type Invite = {
  id: string; email: string; role: AgencyRole; token: string;
  createdAt: string; expiresAt: string; status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

/** Запрошення команди за останні 30 днів (бачать власник і менеджер — RLS agency_invites_read) */
export async function listInvites(agencyId: string): Promise<Invite[]> {
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const { data, error } = await (await supabaseServer()).from('agency_invites')
    .select('id, email, role, token, created_at, expires_at, accepted_at, revoked_at')
    .eq('agency_id', agencyId).gte('created_at', since).order('created_at', { ascending: false }).limit(100);
  if (error) {
    if (!missingSchema(error)) console.error('agency invites failed:', error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? []).map((r) => ({
    id: r.id, email: r.email, role: isAgencyRole(r.role) ? r.role : 'agent', token: r.token,
    createdAt: r.created_at, expiresAt: r.expires_at,
    status: r.accepted_at ? 'accepted' : r.revoked_at ? 'revoked' : Date.parse(r.expires_at) < now ? 'expired' : 'pending',
  }));
}

export async function inviteMember(email: string, role: AgencyRole) {
  const { data, error } = await (await supabaseServer()).rpc('invite_member', { p_email: email, p_role: role });
  if (error) return { error: missingSchema(error) ? NEEDS_UPDATE : error.message };
  return { invite: data as { id: string; token: string } };
}

export async function revokeInvite(id: string) {
  const { error } = await (await supabaseServer()).rpc('revoke_invite', { p_id: id });
  return error ? (missingSchema(error) ? NEEDS_UPDATE : error.message) : null;
}

export type InviteInfo = {
  agency: { id: string; name: string; brand: string };
  role: AgencyRole; email: string; inviter: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

export async function inviteInfo(token: string): Promise<InviteInfo | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const { data, error } = await (await supabaseServer()).rpc('invite_info', { p_token: token });
  if (error) {
    if (!missingSchema(error)) console.error('invite_info failed:', error.message);
    return null;
  }
  return (data as InviteInfo | null) ?? null;
}

export async function acceptInvite(token: string) {
  const { data, error } = await (await supabaseServer()).rpc('accept_invite', { p_token: token });
  if (error) return { error: missingSchema(error) ? NEEDS_UPDATE : error.message };
  return { agency: data as { id: string; name: string } };
}

export async function setMemberRole(memberId: string, role: AgencyRole) {
  const { error } = await (await supabaseServer()).rpc('set_member_role', { p_member: memberId, p_role: role });
  return error ? (missingSchema(error) ? NEEDS_UPDATE : error.message) : null;
}
