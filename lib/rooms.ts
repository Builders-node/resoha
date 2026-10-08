/**
 * Фототур, як у LUN: фото обʼєкта згруповані за кімнатами. Ріелтор у формі
 * позначає, що на кожному фото; на сторінці кожна кімната — плитка з чотирьох фото.
 * Позначки зберігаються як { url фото: кімната } — порядок фото міняють, а позначка лишається своєю.
 */
export const ROOMS = [
  ['living', 'Living room'],
  ['bedroom', 'Bedroom'],
  ['kitchen', 'Kitchen'],
  ['dining', 'Dining area'],
  ['bathroom', 'Bathroom'],
  ['office', 'Office'],
  ['laundry', 'Laundry'],
  ['terrace', 'Terrace & balcony'],
  ['pool', 'Pool'],
  ['garden', 'Garden & yard'],
  ['exterior', 'Exterior'],
  ['view', 'View'],
  ['amenities', 'Amenities'],
] as const;

export type RoomKey = (typeof ROOMS)[number][0];
export type PhotoRooms = Record<string, RoomKey>;

const KEYS = new Set<string>(ROOMS.map(([k]) => k));
const LABELS = Object.fromEntries(ROOMS) as Record<RoomKey, string>;

export const roomLabel = (key: RoomKey) => LABELS[key];

/** Лише відомі кімнати і, якщо передано, лише фото, що ще є в оголошенні. */
export function cleanPhotoRooms(raw: unknown, photos?: string[]): PhotoRooms {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const keep = photos ? new Set(photos) : null;
  const out: PhotoRooms = {};
  for (const [url, room] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof room === 'string' && KEYS.has(room) && (!keep || keep.has(url))) out[url] = room as RoomKey;
  }
  return out;
}

export type TourGroup = { room: RoomKey; photos: string[] };

/** Групи у фіксованому порядку кімнат; фото без позначки у фототур не потрапляють. */
export function photoTour(photos: string[], rooms: PhotoRooms): TourGroup[] {
  const by = new Map<RoomKey, string[]>();
  for (const p of photos) {
    const room = rooms[p];
    if (room) by.set(room, [...(by.get(room) ?? []), p]);
  }
  return ROOMS.filter(([k]) => by.has(k)).map(([room]) => ({ room, photos: by.get(room)! }));
}
