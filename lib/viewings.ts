import { cleanSchedule, type WeekSchedule } from './visits';

/**
 * Запис на перегляд вторинки (міграція 0069): години показів ріелтора.
 * Ріелтор, що нічого не налаштовував, показує в типові години — так запис на слот
 * працює одразу для всіх оголошень, а не лише для тих, хто зайшов у налаштування.
 */
export const DEFAULT_VIEWING_SCHEDULE: WeekSchedule = [0, 1, 2, 3, 4, 5, 6]
  .map((i) => (i < 6 ? { open: '09:00', close: '17:00' } : null));

export type ViewingHours = {
  /** [] у базі — типові години; тут уже підставлені */
  schedule: WeekSchedule;
  /** true — ріелтор свої години задав сам */
  custom: boolean;
  /** false — ріелтор вимкнув запис на слот */
  enabled: boolean;
};

export function viewingHours(raw: { viewing_schedule?: unknown; viewing_slots?: unknown } | null | undefined): ViewingHours {
  const own = cleanSchedule(raw?.viewing_schedule);
  return {
    schedule: own.length ? own : DEFAULT_VIEWING_SCHEDULE,
    custom: own.length > 0,
    enabled: raw?.viewing_slots !== false,
  };
}

/** Тема для ріелтора в заявці — що покупець хоче на перегляді */
export const VIEWING_TOPICS = ['In-person viewing', 'Video call viewing', 'Price and terms', 'Rental history'];
