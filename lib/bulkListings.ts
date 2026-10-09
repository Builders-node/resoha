import { deleteListing, getListing, updateListing } from './db';
import { UNIT_STATUSES, type UnitStatus } from './units';
import type { Listing } from './types';

/**
 * Масові дії з кабінету: ціна, стан продажу, зняти з показу, видалити.
 * Кожне оголошення йде тим самим шляхом, що й поодинці (updateListing / deleteListing),
 * тож права, модерація й історія цін працюють як завжди — RLS просто не пустить до чужого.
 */
export type BulkAction =
  | { action: 'price'; mode: 'set'; value: number }
  | { action: 'price'; mode: 'percent'; value: number }
  | { action: 'status'; status: UnitStatus }
  | { action: 'takedown' }
  | { action: 'delete' };

export const BULK_MAX = 200;
const PARALLEL = 6;

export function parseBulk(body: Record<string, unknown>): { ids: string[]; op: BulkAction } | string {
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String))].filter(Boolean) : [];
  if (!ids.length) return 'Select at least one listing';
  if (ids.length > BULK_MAX) return `Up to ${BULK_MAX} listings at a time`;
  const value = Number(body.value);
  switch (body.action) {
    case 'price':
      if (body.mode === 'percent') {
        if (!Number.isFinite(value) || value === 0 || value <= -90 || value > 500) return 'Enter a change between -90% and +500%';
        return { ids, op: { action: 'price', mode: 'percent', value } };
      }
      if (!Number.isFinite(value) || value <= 0) return 'Enter a price above zero';
      return { ids, op: { action: 'price', mode: 'set', value } };
    case 'status':
      if (!UNIT_STATUSES.some(([k]) => k === body.status)) return 'Unknown status';
      return { ids, op: { action: 'status', status: body.status as UnitStatus } };
    case 'takedown':
      return { ids, op: { action: 'takedown' } };
    case 'delete':
      return { ids, op: { action: 'delete' } };
    default:
      return 'Unknown action';
  }
}

/** Ціна після зміни на відсоток: до цілого долара */
const bump = (price: number, pct: number) => Math.max(1, Math.round(price * (1 + pct / 100)));

async function one(id: string, op: BulkAction): Promise<boolean> {
  if (op.action === 'delete') return deleteListing(id);
  let patch: Partial<Listing>;
  if (op.action === 'price') {
    if (op.mode === 'set') patch = { price: op.value };
    else {
      const cur = await getListing(id);
      if (!cur) return false;
      patch = { price: bump(cur.price, op.value) };
    }
  } else if (op.action === 'status') patch = { status: op.status };
  // «зняти» = той самий перемикач, що й «Unpublish» у таблиці: строк і модерація не чіпаються
  else patch = { active: false };
  return Boolean(await updateListing(id, patch));
}

export async function runBulk(ids: string[], op: BulkAction) {
  const failed: string[] = [];
  let done = 0;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    const part = ids.slice(i, i + PARALLEL);
    const res = await Promise.allSettled(part.map((id) => one(id, op)));
    res.forEach((r, j) => {
      if (r.status === 'fulfilled' && r.value) done++;
      else failed.push(part[j]);
    });
  }
  return { done, failed };
}
