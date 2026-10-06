import type { NearbyPlace } from './nearby';
import type { ProjectInfo, Unit } from './units';

export type Deal = 'sale' | 'rent';
export type PropertyType = 'condo' | 'house' | 'land' | 'commercial';
/** 'user' — покупець/орендар, 'agent' — ріелтор (незалежний або в агенції) */
export type Role = 'user' | 'agent';

/** Агенція нерухомості. Власник — user з isOwner=true та цим agencyId. */
export interface Agency {
  id: string;
  name: string;
  brand: string;          // фірмовий колір картки
  phone: string;
  email: string;
  about: string;
  verified: boolean;
  ownerId: string;
  inviteCode: string;     // код, за яким ріелтор приєднується до агенції
  createdAt: string;
}

/**
 * Рядок таблиці `profiles` (паролі живуть у Supabase Auth, не тут).
 * Покупець заповнює лише базові поля, ріелтор — ще й профільні.
 */
export interface Profile {
  id: string;
  role: Role;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  whatsapp: string;
  createdAt: string;
  active: boolean;

  /* профіль ріелтора */
  agencyId: string | null;  // null — незалежний ріелтор
  isOwner: boolean;         // власник агенції
  isAdmin: boolean;         // адміністратор платформи
  agency: string;           // назва агенції для показу ('Independent agent')
  experience: number;
  rating: number;
  reviews: number;
  verified: boolean;
  languages: string[];
  about: string;
}

/** Профіль ріелтора у публічному контексті — той самий рядок. */
export type Agent = Profile;

/** Паспорт ділянки (таблиця land_facts). Є лише в землі; у решти типів — null. */
export interface LandFacts {
  titleStatus: string;
  survey: string;
  roadAccess: string;
  power: string;
  water: string;
  zolitur: string;
  zone: string;
  slope: string;
  view: string;
  beach: string;
  internet: string;
  flood: string;
  ready: boolean;
  checkedAt: string | null;
  checkedBy: string;     // імʼя того, хто заповнив
}

export interface Listing {
  id: string;
  deal: Deal;
  type: PropertyType;
  title: string;
  island: string;
  neighborhood: string;
  address: string;
  price: number;
  hoa: number;
  beds: number;
  baths: number;
  sqft: number;
  lotAcres: number;
  year: number;
  oceanfront: boolean;
  titled: boolean;
  ownerFinancing: boolean;
  lat: number;
  lng: number;
  agentId: string;          // автор — user.id
  agencyId: string | null;  // від чийого імені опубліковано
  featured: boolean;
  active: boolean;
  views: number;
  createdAt: string;
  tags: string[];
  photos: string[];
  text: string;
  /* Звідки взяті факти. Порожньо — оголошення завів сам ріелтор. */
  sourceName: string;
  sourceRef: string;
  sourceUrl: string;
  land: LandFacts | null;
  /** Місця поблизости, додані ріелтором вручну */
  nearby: NearbyPlace[];
  /** Квартири в будинку з цінами; порожньо — звичайне одиночне оголошення */
  units: Unit[];
  /** Забудовник, термін здачі, стан продажів — для новобудов з юнітами */
  project: ProjectInfo;
}

export interface Lead {
  id: string;
  listingId: string;
  agentId: string;
  agencyId: string | null;
  userId: string | null;      // акаунт покупця, якщо заявку лишили з-під логіна
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'new' | 'done';
  channel: 'form' | 'whatsapp';   // форма на сторінці чи перехід у WhatsApp
  listingTitle: string;       // підтягується джойном для списків
  agentName: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  title: string;
  query: string;
  createdAt: string;
  /* рахує /api/saved-searches: скільки збігів зараз і скільки зʼявилось після збереження */
  total?: number;
  fresh?: number;
}

export interface Session {
  id: string;               // user.id
  role: Role;
  name: string;
  avatar: string;
  agencyId: string | null;
  isOwner: boolean;         // власник агенції
  isAdmin: boolean;         // адміністратор платформи
}

export type SortKey = 'new' | 'price_asc' | 'price_desc' | 'sqft_desc' | 'popular';

export interface ListingQuery {
  deal?: Deal;
  type?: PropertyType;
  island?: string;
  neighborhoods?: string[];
  beds?: number[];
  bathsMin?: number;
  priceMin?: number;
  priceMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  lotMin?: number;
  lotMax?: number;
  hoaMax?: number;
  yearMin?: number;
  oceanfront?: boolean;
  titled?: boolean;
  ownerFinancing?: boolean;
  tags?: string[];
  q?: string;
  agentId?: string;
  agencyId?: string;
  sort?: SortKey;
  /** межі карти: [south, west, north, east] */
  bbox?: [number, number, number, number];
  ids?: string[];
  includeInactive?: boolean;
  /** лише земля, готова до будівництва (land_facts.ready) */
  ready?: boolean;
}

/** Відгук про ріелтора. Рейтинг у профілі перераховує тригер у базі. */
export interface Review {
  id: string;
  agentId: string;
  authorId: string;
  rating: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string;
  agentName?: string;   // заповнюється лише в адмінському списку
}

/** Запис у журналі адмінських дій. */
export interface AdminLogEntry {
  id: string;
  actorName: string;
  action: string;
  targetKind: 'listing' | 'profile' | 'agency' | 'review';
  targetId: string | null;
  targetName: string;
  reason: string;
  createdAt: string;
}
