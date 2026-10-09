import type { Lead, LeadStatus } from './types';

/**
 * Воронка заявки (міграція 0053): нова → звʼязались → перегляд → пропозиція → угода,
 * або програна з причиною. Порядок тут — порядок колонок і фільтра в кабінеті.
 */
export const LEAD_STAGES: [LeadStatus, string][] = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['viewing', 'Viewing'],
  ['offer', 'Offer'],
  ['deal', 'Deal'],
  ['lost', 'Lost'],
];

const STAGE_KEYS = new Set<string>(LEAD_STAGES.map(([k]) => k));
export const isLeadStatus = (v: unknown): v is LeadStatus => STAGE_KEYS.has(String(v));
export const leadStageLabel = (s: string) => LEAD_STAGES.find(([k]) => k === s)?.[1] ?? s;

/** Готові причини програшу; «Other» — з вільним текстом */
export const LOST_REASONS = [
  'Bought or rented elsewhere',
  'Out of budget',
  'Stopped responding',
  'Changed plans',
  'Financing fell through',
  'Not a real buyer',
];

/** Тон пігулки стадії */
export const stageTone = (s: LeadStatus) =>
  s === 'new' ? 'pill--on' : s === 'deal' ? 'pill--ok' : s === 'lost' ? 'pill--warn' : 'pill--off';

/** Поле CSV: лапки, якщо є кома, лапки чи перенос; формули Excel гасимо апострофом */
function cell(v: unknown) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV заявок для Excel / Google Sheets. BOM — щоб Excel не ламав кирилицю й іспанські літери. */
export function leadsCsv(leads: Lead[], agentName: (id: string) => string) {
  const head = ['Date', 'Name', 'Phone', 'Email', 'Stage', 'Lost reason', 'Channel', 'Listing', 'Development',
    'Agent', 'Visit', 'Message'];
  const rows = leads.map((l) => [
    l.createdAt, l.name, l.phone, l.email, leadStageLabel(l.status), l.lostReason, l.channel,
    l.listingTitle, l.developmentName, agentName(l.agentId), l.visitAt ?? '', l.message,
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}
