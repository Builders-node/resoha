import { supabaseServer } from './supabase/server';
import { isLeadStatus } from './leadFunnel';
import type { LeadEvent, LeadStatus } from './types';

/**
 * CRM заявок: стадія, причина програшу, перепризначення, історія й нотатки.
 * Права — у базі (RLS + тригер leads_crm_guard з міграції 0053); тут лише форма даних
 * і запасний шлях для бази, де міграції ще немає.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Нема колонки чи таблиці — міграція 0053 ще не застосована */
const missing = (e: { code?: string } | null) => Boolean(e && ['PGRST204', 'PGRST205', '42703', '42P01'].includes(e.code ?? ''));

export type LeadPatch = { status?: LeadStatus; lostReason?: string; agentId?: string };

export class LeadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Розбір тіла PATCH: невідоме відкидаємо, про неправильну стадію кажемо прямо */
export function parseLeadPatch(body: Row): LeadPatch {
  const out: LeadPatch = {};
  if (body.status !== undefined) {
    // старий клієнт шле done — це «звʼязались»
    const s = body.status === 'done' ? 'contacted' : body.status;
    if (!isLeadStatus(s)) throw new LeadError('Unknown stage');
    out.status = s;
  }
  if (body.lostReason !== undefined) out.lostReason = String(body.lostReason ?? '').trim().slice(0, 300);
  if (body.agentId !== undefined) {
    if (typeof body.agentId !== 'string' || !body.agentId) throw new LeadError('Choose an agent');
    out.agentId = body.agentId;
  }
  return out;
}

export async function updateLead(id: string, patch: LeadPatch) {
  const supabase = await supabaseServer();

  if (patch.agentId) {
    // база й сама не пустить (leads_crm_guard), але без міграції 0053 охоронця немає —
    // тому перевіряємо тут: власник агенції заявки і ріелтор із цієї ж агенції
    const { data: lead } = await supabase.from('leads').select('agency_id, agent_id').eq('id', id).maybeSingle();
    if (!lead) throw new LeadError('Not found', 404);
    if (lead.agent_id !== patch.agentId) {
      if (!lead.agency_id) throw new LeadError('Only agency enquiries can be reassigned', 403);
      const [{ data: owner }, { data: member }] = await Promise.all([
        supabase.rpc('is_agency_owner', { a: lead.agency_id }),
        supabase.from('agency_members').select('profile_id')
          .eq('agency_id', lead.agency_id).eq('profile_id', patch.agentId).maybeSingle(),
      ]);
      if (!owner) throw new LeadError('Only the agency owner can reassign an enquiry', 403);
      if (!member) throw new LeadError('Choose an agent of this agency', 400);
    }
  }

  const row: Row = {};
  if (patch.status) row.status = patch.status;
  if (patch.lostReason !== undefined) row.lost_reason = patch.status && patch.status !== 'lost' ? '' : patch.lostReason;
  if (patch.agentId) row.agent_id = patch.agentId;
  if (!Object.keys(row).length) throw new LeadError('Nothing to change');

  let res = await supabase.from('leads').update(row).eq('id', id).select('id').maybeSingle();
  // до міграції 0053: лише new/done і без причини програшу
  if (res.error && (missing(res.error) || res.error.code === '23514')) {
    delete row.lost_reason;
    if (row.status) row.status = row.status === 'new' ? 'new' : 'done';
    if (Object.keys(row).length) res = await supabase.from('leads').update(row).eq('id', id).select('id').maybeSingle();
  }
  if (res.error) throw new LeadError(res.error.message, res.error.code === '42501' ? 403 : 400);
  if (!res.data) throw new LeadError('Forbidden', 403);
}

export async function leadEvents(leadId: string): Promise<{ items: LeadEvent[]; available: boolean }> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('lead_events')
    .select('*, actor:profiles!lead_events_actor_id_fkey(name)')
    .eq('lead_id', leadId).order('created_at').order('id').limit(500);
  if (error) {
    if (missing(error)) return { items: [], available: false };
    throw new LeadError(error.message);
  }
  return {
    available: true,
    items: (data ?? []).map((r: Row) => ({
      id: Number(r.id), leadId: r.lead_id, kind: r.kind, actorId: r.actor_id ?? null,
      actorName: r.actor?.name ?? '', from: r.from_value, to: r.to_value, body: r.body, createdAt: r.created_at,
    })),
  };
}

export async function addLeadNote(leadId: string, actorId: string, body: string) {
  const text = body.trim().slice(0, 2000);
  if (!text) throw new LeadError('Write a note first');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('lead_events').insert({ lead_id: leadId, kind: 'note', actor_id: actorId, body: text });
  if (error) {
    if (missing(error)) throw new LeadError('Notes are not available yet', 503);
    throw new LeadError(error.code === '42501' ? 'Not allowed' : error.message, error.code === '42501' ? 403 : 400);
  }
}
