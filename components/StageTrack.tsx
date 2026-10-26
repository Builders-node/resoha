import { BUILDING_STAGES, stageIndex } from '@/lib/units';

/**
 * Шкала стадій будівництва (проєкт → підготовка → будівництво → збудовано → здано),
 * та сама, що на картках будинків. light — для світлого фону, а не поверх фото.
 */
export default function StageTrack({ stage, label, light }: { stage: string; label: string; light?: boolean }) {
  const step = stageIndex(stage);
  const done = stage === 'built' || stage === 'delivered';
  return (
    <div className={`bld__track${done ? ' is-done' : ''}${light ? ' bld__track--light' : ''}`} role="img" aria-label={label}>
      {BUILDING_STAGES.map(([k], i) => <i key={k} className={i <= step ? 'is-on' : undefined} />)}
    </div>
  );
}
