import type { LandFacts } from './types';

/**
 * «Паспорт ділянки»: єдине місце, де описано, що ми питаємо про землю і як
 * з відповідей складається оцінка готовності. Картка, сторінка, форма, фільтр,
 * PDF і адмінка беруть усе звідси.
 */
export type LandKey = keyof Omit<LandFacts, 'ready' | 'checkedAt' | 'checkedBy'>;

export type LandField = {
  key: LandKey;
  label: string;
  /** код → підпис; перший варіант — «добре», unknown завжди останній */
  options: [string, string][];
  /** відповіді, що зараховуються в індекс готовності; поля без good — довідкові */
  good?: string[];
};

export const LAND_FIELDS: LandField[] = [
  { key: 'titleStatus', label: 'Title', good: ['registered'], options: [
    ['registered', 'Registered, free & clear'], ['in_progress', 'Being registered'],
    ['none', 'No title — possession only'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'roadAccess', label: 'Road access', good: ['paved', 'gravel'], options: [
    ['paved', 'Paved road'], ['gravel', 'Gravel or dirt road'], ['none', 'No road yet'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'power', label: 'Electricity', good: ['at_lot', 'nearby'], options: [
    ['at_lot', 'RECO line at the lot'], ['nearby', 'Line nearby'], ['none', 'No power nearby'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'water', label: 'Water', good: ['well', 'cistern', 'municipal'], options: [
    ['well', 'Well'], ['cistern', 'Cistern / rain catchment'], ['municipal', 'Municipal supply'],
    ['none', 'None'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'survey', label: 'Survey', options: [
    ['yes', 'Topographic survey on file'], ['no', 'No survey'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'zolitur', label: 'ZOLITUR building permit', options: [
    ['yes', 'Granted'], ['no', 'Not applied for'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'zone', label: 'Zone', options: [
    ['residential', 'Residential'], ['tourism', 'Tourism'], ['protected', 'Protected area'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'slope', label: 'Slope', options: [
    ['flat', 'Flat'], ['moderate', 'Moderate'], ['steep', 'Steep'], ['unknown', 'Not confirmed'],
  ] },
];

export const EMPTY_LAND: LandFacts = {
  titleStatus: 'unknown', survey: 'unknown', roadAccess: 'unknown', power: 'unknown',
  water: 'unknown', zolitur: 'unknown', zone: 'unknown', slope: 'unknown',
  ready: false, checkedAt: null, checkedBy: '',
};

export const landLabel = (field: LandField, value: string) =>
  field.options.find(([v]) => v === value)?.[1] ?? 'Not confirmed';

export const isChecked = (land: LandFacts | null | undefined): land is LandFacts => Boolean(land?.checkedAt);

/** Чотири базові відповіді (титул, дорога, світло, вода) → оцінка. У базі те саме правило дає колонку ready. */
export function readiness(land: LandFacts | null | undefined) {
  if (!isChecked(land)) return { score: 0, of: 4, label: 'Not checked yet', tone: 'muted' as const };
  const core = LAND_FIELDS.filter((f) => f.good);
  const score = core.filter((f) => f.good!.includes(land[f.key])).length;
  if (score === core.length) return { score, of: core.length, label: 'Ready to build', tone: 'ok' as const };
  if (score >= 2) return { score, of: core.length, label: 'Needs work', tone: 'warn' as const };
  return { score, of: core.length, label: 'Raw land', tone: 'bad' as const };
}
