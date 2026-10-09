import { supabaseServer } from './supabase/server';
import { cleanSchedule, NO_LIMITS, slotKey, type Availability, type VisitStatus, type WeekSchedule } from './visits';

/**
 * Записи на візит (міграція 0055): зайняті слоти, картка запису за токеном з листа,
 * календар команди. Усе — від імені користувача: права тримають RLS і функції в базі.
 * До міграції функцій і таблиці немає — тоді працюємо як раніше, без місткості й статусів.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Помилка «функції / таблиці / колонки ще немає» — міграцію не застосовано */
export const missingSchema = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(e.code ?? '')
    || /does not exist|could not find/i.test(e.message ?? '')));

/** Свята, місткість і зайняті місця ЖК — для календаря запису */
export async function visitAvailability(dev: { id: string; visitCapacity: number; blackoutDates: string[] }): Promise<Availability> {
  const base = { ...NO_LIMITS, capacity: dev.visitCapacity || 1, blackout: dev.blackoutDates ?? [] };
  const { data, error } = await (await supabaseServer()).rpc('visit_busy', { p_development: dev.id });
  if (error) {
    if (!missingSchema(error)) console.error('visit_busy failed:', error.message);
    return base;
  }
  const busy: Record<string, number> = {};
  for (const r of (data ?? []) as { visit_at: string; booked: number }[]) busy[slotKey(r.visit_at)] = Number(r.booked) || 0;
  return { ...base, busy };
}

export type VisitCard = {
  leadId: string;
  status: VisitStatus;
  cancelledBy: '' | 'buyer' | 'team';
  visitAt: string;
  name: string;
  listing: { id: string; title: string; development?: string; developmentSlug?: string };
  development: {
    id: string; name: string; slug: string; schedule: WeekSchedule; capacity: number; blackout: string[];
    office: string; address: string; neighborhood: string; hours: string;
  } | null;
  agent: { name: string; phone: string; whatsapp: string } | null;
};

const mapCard = (r: Row | null): VisitCard | null => r && r.leadId ? {
  leadId: r.leadId, status: r.status ?? 'booked', cancelledBy: r.cancelledBy ?? '', visitAt: r.visitAt, name: r.name ?? '',
  listing: r.listing ?? { id: '', title: '' },
  development: r.development ? {
    ...r.development, schedule: cleanSchedule(r.development.schedule), capacity: Number(r.development.capacity) || 1,
    blackout: r.development.blackout ?? [], office: r.development.office ?? '', address: r.development.address ?? '',
    neighborhood: r.development.neighborhood ?? '', hours: r.development.hours ?? '',
  } : null,
  agent: r.agent ?? null,
} : null;

export async function lookupVisit(token: string): Promise<VisitCard | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const { data, error } = await (await supabaseServer()).rpc('visit_lookup', { p_token: token });
  if (error) {
    if (!missingSchema(error)) console.error('visit_lookup failed:', error.message);
    return null;
  }
  return mapCard(data as Row | null);
}

/** Скасувати чи перенести за токеном. Помилки бази приходять готовим текстом для покупця. */
export async function manageVisit(token: string, action: 'cancel' | 'reschedule', at?: string) {
  const { data, error } = await (await supabaseServer()).rpc('visit_manage', {
    p_token: token, p_action: action, p_at: at ?? null,
  });
  if (error) return { error: error.message };
  return { visit: mapCard(data as Row) };
}

export type TeamVisit = {
  id: string;
  visitAt: string;
  status: VisitStatus;
  cancelledBy: string;
  name: string;
  phone: string;
  email: string;
  interests: string[];
  contactVia: string;
  agentId: string;
  agentName: string;
  listingId: string;
  listingTitle: string;
  developmentName: string;
  developmentSlug: string;
};

/** Візити, які бачить користувач (свої, а з роллю — команди), у проміжку [from, to) */
export async function teamVisits(from: string, to: string): Promise<TeamVisit[]> {
  const client = await supabaseServer();
  const cols = 'id, visit_at, name, phone, email, interests, contact_via, agent_id, listing_id, '
    + 'listing:listings(title, development:developments(name, slug)), agent:profiles!leads_agent_id_fkey(name)';
  const query = (withBooking: boolean) => client.from('leads')
    .select(withBooking ? `${cols}, booking:visit_bookings(status, cancelled_by)` : cols)
    .eq('channel', 'visit').gte('visit_at', from).lt('visit_at', to)
    .order('visit_at', { ascending: true }).limit(500);
  let { data, error } = await query(true);
  if (error && missingSchema(error)) ({ data, error } = await query(false));
  if (error) {
    console.error('team visits failed:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const b = Array.isArray(r.booking) ? r.booking[0] : r.booking;
    return {
      id: r.id, visitAt: r.visit_at, status: (b?.status ?? 'booked') as VisitStatus, cancelledBy: b?.cancelled_by ?? '',
      name: r.name, phone: r.phone ?? '', email: r.email ?? '', interests: r.interests ?? [], contactVia: r.contact_via ?? '',
      agentId: r.agent_id, agentName: r.agent?.name ?? '', listingId: r.listing_id, listingTitle: r.listing?.title ?? '',
      developmentName: r.listing?.development?.name ?? '', developmentSlug: r.listing?.development?.slug ?? '',
    };
  });
}

export async function setVisitStatus(leadId: string, status: VisitStatus) {
  const { error } = await (await supabaseServer()).rpc('visit_set_status', { p_lead: leadId, p_status: status });
  if (error) return missingSchema(error) ? 'Visit statuses need the latest database update' : error.message;
  return null;
}

/** Місткість і свята ЖК: окремим запитом, щоб база без 0055 не ламала збереження решти полів ЖК */
export async function saveVisitSettings(devId: string, capacity: number, blackout: string[]) {
  const { data, error } = await (await supabaseServer()).from('developments')
    .update({ visit_capacity: capacity, blackout_dates: blackout }).eq('id', devId).select('id').maybeSingle();
  if (error) return missingSchema(error) ? 'Visit settings need the latest database update' : error.message;
  if (!data) return 'Not allowed';
  return null;
}
