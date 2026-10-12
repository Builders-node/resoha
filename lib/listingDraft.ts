/**
 * Автозбереження форми оголошення в браузері (localStorage): що ріелтор набрав, не губиться
 * при закритті вкладки чи збої мережі. Нічого не публікує — лише відновлює поля форми.
 * Доступ до сховища може кинути виняток (приватний режим, заблоковані дані) — тоді мовчки без нього.
 */

export type FieldValues = Record<string, string | string[]>;

export type ListingDraft = {
  v: 1;
  /** коли збережено, мс */
  at: number;
  /** updatedAt оголошення, з якого почали правити; для нового — '' */
  base: string;
  step: number;
  fields: FieldValues;
  state: Record<string, unknown>;
};

/** Поля, якими керує React-стан форми (їх відновлюємо через стан, а не DOM) і службові */
const SKIP = new Set(['deal', 'type', 'lat', 'lng', 'neighborhood', 'website', 'intent', 'sqft']);

export const draftKey = (listingId?: string | null, admin?: boolean) =>
  `resoha:listing-draft:${listingId || 'new'}${admin ? ':admin' : ''}`;

/** Значення всіх іменованих полів форми: галочки-списки (inUnit) — масивом, одиночні — 'on' або '' */
export function readFields(form: HTMLFormElement): FieldValues {
  const out: FieldValues = {};
  const multi = new Map<string, string[]>();
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement;
    if (!f.name || SKIP.has(f.name) || f.type === 'submit' || f.type === 'button' || f.type === 'file') continue;
    if (f.type === 'checkbox') {
      if (f.value && f.value !== 'on') {
        const list = multi.get(f.name) ?? [];
        if (f.checked) list.push(f.value);
        multi.set(f.name, list);
      } else out[f.name] = f.checked ? 'on' : '';
    } else out[f.name] = f.value;
  }
  for (const [k, v] of multi) out[k] = v;
  return out;
}

/** Записати значення назад у форму. Поля, яких зараз немає в DOM, просто пропускаються. */
export function writeFields(form: HTMLFormElement, fields: FieldValues) {
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement;
    if (!f.name || SKIP.has(f.name) || !(f.name in fields)) continue;
    const v = fields[f.name];
    if (f.type === 'checkbox') {
      f.checked = Array.isArray(v) ? v.includes(f.value) : v === 'on';
    } else if (typeof v === 'string' && f.type !== 'submit' && f.type !== 'button' && f.type !== 'file') {
      f.value = v;
    }
  }
}

export function loadDraft(key: string): ListingDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as ListingDraft;
    // старше 30 днів — уже не те, що людина памʼятає
    if (d?.v !== 1 || !d.fields || Date.now() - d.at > 30 * 86_400_000) return null;
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, d: ListingDraft) {
  try { localStorage.setItem(key, JSON.stringify(d)); } catch { /* сховище недоступне */ }
}

export function clearDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* сховище недоступне */ }
}

/** Порівняння без часу збереження: чи є що відновлювати */
export const sameContent = (a: Pick<ListingDraft, 'fields' | 'state'>, b: Pick<ListingDraft, 'fields' | 'state'>) =>
  JSON.stringify([a.fields, a.state]) === JSON.stringify([b.fields, b.state]);
