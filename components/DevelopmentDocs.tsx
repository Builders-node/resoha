import Icon from './Icon';
import { DOC_KINDS } from '@/lib/units';
import type { DevelopmentDocument } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

/**
 * «Документи» ЖК, як у LUN: згруповані за типом (земля, дозволи, введення, компанії),
 * у кожного — номер, дата, файл і позначка, якщо команда Resoha його перевірила.
 */
export default async function DevelopmentDocs({ docs }: { docs: DevelopmentDocument[] }) {
  const t = await getT();
  const groups = DOC_KINDS.map(([k, label]) => [label, docs.filter((d) => d.kind === k)] as const).filter(([, l]) => l.length);
  return (
    <div className="docs">
      {groups.map(([label, list]) => (
        <div key={label} className="docs__group">
          <h3 className="docs__kind">{t(label)}</h3>
          <ul className="docs__list">
            {list.map((d) => (
              <li key={d.id} className="docs__item">
                <Icon name="deed" size={22} />
                <div className="docs__body">
                  <b>{d.title}</b>
                  {(d.number || d.issued) && (
                    <span className="small muted">{[d.number && t('No. {n}', { n: d.number }), d.issued && t('issued {date}', { date: d.issued })].filter(Boolean).join(' · ')}</span>
                  )}
                  {d.note && <span className="small muted">{d.note}</span>}
                  {d.verified && (
                    <span className="docs__ok tiny"><Icon name="check" size={13} strokeWidth={2.6} /> {t('Checked by Resoha')}</span>
                  )}
                </div>
                {d.file && (
                  <a className="docs__open" href={d.file} target="_blank" rel="noreferrer">
                    <Icon name="download" size={18} /> <span>{/\.pdf($|\?)/i.test(d.file) ? 'PDF' : t('Open')}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="tiny muted">
        {t('Documents are uploaded by the listing agent. Before paying a deposit, have your own Honduran lawyer check the title and permits in the property registry.')}
      </p>
    </div>
  );
}
