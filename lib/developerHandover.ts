import { supabaseServer } from './supabase/server';
import { missingSchema } from './visitBookings';

const NEEDS_UPDATE = 'This needs the latest database update';

export type HandoverInfo = {
  developer: { id: string; slug: string; name: string; logo: string };
  from: string;
  /** профіль уже належить тому, хто відкрив посилання */
  mine: boolean;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

/** Посилання на передачу профілю забудовника: лише власник профілю або адмін */
export async function createHandover(developerId: string) {
  const { data, error } = await (await supabaseServer()).rpc('create_developer_handover', { p_developer: developerId });
  if (error) return { error: missingSchema(error) ? NEEDS_UPDATE : error.message };
  return { handover: data as { token: string; expiresAt: string } };
}

export async function handoverInfo(token: string): Promise<HandoverInfo | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const { data, error } = await (await supabaseServer()).rpc('developer_handover_info', { p_token: token });
  if (error) {
    if (!missingSchema(error)) console.error('developer_handover_info failed:', error.message);
    return null;
  }
  return (data as HandoverInfo | null) ?? null;
}

export async function acceptHandover(token: string) {
  const { data, error } = await (await supabaseServer()).rpc('accept_developer_handover', { p_token: token });
  if (error) return { error: missingSchema(error) ? NEEDS_UPDATE : error.message };
  return { developer: data as { id: string; slug: string; name: string } };
}
