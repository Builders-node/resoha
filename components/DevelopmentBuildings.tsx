import { BUILDING_STAGES, stageIndex, stageLabel } from '@/lib/units';
import type { Building, Listing } from '@/lib/types';

/**
 * «Статус будівництва»: картка на кожен дім ЖК — фото, назва, стадія зі шкалою,
 * поверхи й кількість квартир, термін здачі, адреса. Клік веде до шахматки цього дому.
 */
export default function DevelopmentBuildings({ buildings, units, fallbackPhoto, hrefFor }: {
  buildings: Building[];
  units: Listing[];
  fallbackPhoto: string;
  /** Куди веде картка; за замовчуванням — до шахматки дому на тій самій сторінці */
  hrefFor?: (b: Building) => string;
}) {
  return (
    <div className="bld-grid">
      {buildings.map((b) => {
        const count = units.filter((u) => u.buildingId === b.id).length;
        const step = stageIndex(b.stage);
        const photo = b.photo || fallbackPhoto;
        const done = b.stage === 'built' || b.stage === 'delivered';
        return (
          <a key={b.id} href={hrefFor ? hrefFor(b) : `#bld-${b.id}`} className="bld">
            {photo ? <img src={photo} alt="" className="bld__img" loading="lazy" /> : <div className="bld__img bld__img--empty" />}
            <span className="bld__name">{b.name}</span>
            <div className="bld__body">
              <b className="bld__stage">{stageLabel(b.stage)}</b>
              <div className={`bld__track${done ? ' is-done' : ''}`} aria-label={`Stage ${step + 1} of ${BUILDING_STAGES.length}`}>
                {BUILDING_STAGES.map(([k], i) => <i key={k} className={i <= step ? 'is-on' : undefined} />)}
              </div>
              <ul className="bld__facts">
                {(b.floors || count > 0) && (
                  <li>{[b.floors && `${b.floors} floors`, count > 0 && `${count} units`].filter(Boolean).join(', ')}</li>
                )}
                {b.completion && <li>{done ? 'Delivered' : 'Completion'} {b.completion}</li>}
                {b.address && <li>{b.address}</li>}
              </ul>
            </div>
          </a>
        );
      })}
    </div>
  );
}
