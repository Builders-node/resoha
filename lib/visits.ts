/**
 * Запис на візит у відділ продажів ЖК, як у LUN: графік роботи по днях, слоти по пів години
 * в часовому поясі офісу, теми візиту. Спільне для сторінки, форми, API й кабінету.
 */

/** Роатан живе за часом Гондурасу, без переходу на літній час */
export const SALES_TZ = 'America/Tegucigalpa';

/** Тиждень з понеділка; null — вихідний. Час — «HH:MM» за часом офісу. */
export type DaySchedule = { open: string; close: string } | null;
export type WeekSchedule = DaySchedule[];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Крок слотів і скільки часу до закриття має лишатись на візит */
const SLOT_MIN = 30;
const VISIT_MIN = 60;
/** Найраніше — за годину від зараз, найпізніше — на два місяці вперед */
const LEAD_MIN = 60;
export const BOOK_DAYS = 60;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Що завгодно з бази чи форми — у 7 днів; без жодного робочого дня графіка немає ([]) */
export function cleanSchedule(v: unknown): WeekSchedule {
  if (!Array.isArray(v) || v.length !== 7) return [];
  const week = v.map((d): DaySchedule => {
    const open = String((d as { open?: unknown })?.open ?? '');
    const close = String((d as { close?: unknown })?.close ?? '');
    return d && TIME.test(open) && TIME.test(close) && toMin(close) > toMin(open) ? { open, close } : null;
  });
  return week.some(Boolean) ? week : [];
}

/** «Mon – Fri 10:00 – 19:00», «Sat – Sun 10:00 – 18:00»: однакові сусідні дні — одним рядком */
export function scheduleLines(week: WeekSchedule): { days: string; hours: string }[] {
  const out: { from: number; to: number; hours: string }[] = [];
  week.forEach((d, i) => {
    const hours = d ? `${d.open} – ${d.close}` : 'Closed';
    const last = out[out.length - 1];
    if (last && last.hours === hours && last.to === i - 1) last.to = i;
    else out.push({ from: i, to: i, hours });
  });
  return out.map((r) => ({
    days: r.from === r.to ? WEEKDAYS[r.from] : `${WEEKDAYS[r.from]} – ${WEEKDAYS[r.to]}`,
    hours: r.hours,
  }));
}

/** Рік, місяць, день, години, хвилини й день тижня (0 — пн) у часовому поясі офісу */
function partsIn(date: Date, tz = SALES_TZ) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    min: Number(p.hour) * 60 + Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** «2026-10-08» + «10:30» за часом офісу → момент часу. Зсув поясу беремо з Intl, а не вшиваємо. */
export function officeTimeToDate(day: string, time: string, tz = SALES_TZ): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const local = partsIn(guess, tz);
  const shown = Date.parse(`${local.day}T${toTime(local.min)}:00Z`);
  return new Date(guess.getTime() - (shown - guess.getTime()));
}

/** День тижня дати «YYYY-MM-DD» (0 — пн) — без часових поясів, це просто календар */
export const weekdayOf = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Сьогодні за часом офісу */
export const officeToday = (now = new Date()) => partsIn(now).day;

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Вільні слоти дня: від відкриття і до години перед закриттям, не раніше ніж за годину від зараз */
export function slotsFor(week: WeekSchedule, day: string, now = new Date()): string[] {
  const d = week[weekdayOf(day)];
  if (!d) return [];
  const today = officeToday(now);
  if (day < today || day > addDays(today, BOOK_DAYS)) return [];
  const earliest = day === today ? partsIn(now).min + LEAD_MIN : 0;
  const out: string[] = [];
  for (let m = toMin(d.open); m <= toMin(d.close) - VISIT_MIN; m += SLOT_MIN) if (m >= earliest) out.push(toTime(m));
  return out;
}

/** Перевірка на сервері: момент часу потрапляє в один зі слотів графіка */
export function isOpenSlot(week: WeekSchedule, at: Date, now = new Date()) {
  const p = partsIn(at);
  return slotsFor(week, p.day, now).includes(toTime(p.min));
}

/** Ранок / обід / вечір, як у LUN */
export function slotPart(time: string): 'Morning' | 'Afternoon' | 'Evening' {
  const m = toMin(time);
  return m < 12 * 60 ? 'Morning' : m < 16 * 60 ? 'Afternoon' : 'Evening';
}

/** Теми візиту — ключі англійською (вони ж і текст у кабінеті); спальні додаємо з квартир ЖК */
export const VISIT_TOPICS = [
  'Price calculation', 'Permits & documents', 'Purchase terms', 'Reserve a unit', 'Tour of the grounds',
  'Ready units', 'Construction progress', 'Unit viewing', 'Show apartment', 'Payment plan',
  'Purchase paperwork', 'Contract template', 'Special offers', 'Master plan & layouts',
  'Detailed consultation', 'Help choosing a unit', 'Buyer support',
];

export const CONTACT_PREFS = [['phone', 'By phone'], ['whatsapp', 'On WhatsApp'], ['email', 'By email']] as const;
export type ContactPref = (typeof CONTACT_PREFS)[number][0];
/** Для кабінету й тексту заявки: «Prefers WhatsApp» */
export const contactPrefShort = (k: string) => ({ phone: 'a call', whatsapp: 'WhatsApp', email: 'email' } as Record<string, string>)[k] ?? '';

/** «Thu, Oct 8 · 10:30» за часом офісу — у кабінеті й підтвердженні */
export function fmtVisit(iso: string, locale = 'en-US') {
  const at = new Date(iso);
  const date = new Intl.DateTimeFormat(locale, { timeZone: SALES_TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(at);
  return `${date} · ${toTime(partsIn(at).min)}`;
}

/** «У відділі продажу вам запропонують», як у LUN: що можна зробити на візиті. Іконка — з components/Icon */
export const SALES_OFFERS: [icon: string, label: string][] = [
  ['calendar', 'A sales manager’s time reserved just for you'],
  ['deed', 'Brochures and price lists'],
  ['sliders', 'Purchase terms and payment plans'],
  ['users', 'Apartment viewings'],
  ['calc', 'Price calculation'],
  ['chart', 'Rental yield and ROI calculation'],
  ['briefcase', 'Legal consultation'],
  ['sparkle', 'Current promotions'],
  ['tv', 'Project presentation'],
  ['crane', 'Construction site tour'],
  ['lock', 'Unit reservation'],
  ['building', 'Viewing of finished units'],
  ['plan', 'Site plan, floor plans and more'],
  ['search', 'Property selection by your criteria'],
  ['deed', 'Purchase paperwork and contract template'],
  ['shield', 'Support until you get the keys'],
];

/** Про що підписка на оновлення ЖК — список у банері на вкладці «Contacts» */
export const UPDATE_TOPICS = [
  'Promotions, discounts and special offers',
  'New construction photos',
  'Price updates from the sales office',
  'New documents',
];

/* ---------- місткість слота й неробочі дні (міграція 0055) ---------- */

/** Що ще, крім графіка, закриває слоти: свята й уже зайняті місця */
export type Availability = {
  /** «YYYY-MM-DD» за часом офісу */
  blackout: string[];
  /** Момент візиту (ISO) → скільки вже записано */
  busy: Record<string, number>;
  capacity: number;
};

export const NO_LIMITS: Availability = { blackout: [], busy: {}, capacity: 1 };

/** Ключ слота в busy: однаковий для відповіді бази й для слота з графіка */
export const slotKey = (at: Date | string) => new Date(at).toISOString();

/** Вільні слоти з урахуванням свят і місткості; ignore — поточний час запису при перенесенні */
export function freeSlotsFor(week: WeekSchedule, day: string, a: Availability, now = new Date(), ignore?: string): string[] {
  if (a.blackout.includes(day)) return [];
  return slotsFor(week, day, now).filter((time) => {
    const key = slotKey(officeTimeToDate(day, time));
    return key === ignore || (a.busy[key] ?? 0) < Math.max(1, a.capacity);
  });
}

/** День за часом офісу для моменту візиту — щоб звірити зі списком свят */
export const officeDayOf = (at: Date) => partsIn(at).day;

/** Свята з форми: «2026-12-25» по одному в рядку або через кому, без повторів і минулих днів */
export function cleanBlackout(v: unknown, today = officeToday()): string[] {
  const list = Array.isArray(v) ? v.map(String) : String(v ?? '').split(/[\s,;]+/);
  return [...new Set(list.map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)
    && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) && d >= today))].sort().slice(0, 120);
}

/** Статус запису на візит: записаний, скасований, прийшов, не прийшов */
export type VisitStatus = 'booked' | 'cancelled' | 'attended' | 'no_show';
export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  booked: 'Booked', cancelled: 'Cancelled', attended: 'Attended', no_show: 'No-show',
};
