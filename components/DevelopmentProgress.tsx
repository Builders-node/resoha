import Link from 'next/link';
import Photo from './Photo';
import { fmtMonth } from '@/lib/units';
import type { Building, ProgressEntry } from '@/lib/types';
import { getLang } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n';

/**
 * «Хід будівництва», як у LUN: фільтр за домом, далі місяці від нових до старих,
 * у кожному — фото й коротка примітка.
 */
export default async function DevelopmentProgress({ entries, buildings, building, base, name }: {
  entries: ProgressEntry[];
  buildings: Building[];
  building: string;
  base: string;
  name: string;
}) {
  const lang = await getLang();
  const t = makeT(lang);
  const shown = building ? entries.filter((e) => e.buildingId === building) : entries;
  const bname = (id: string | null) => buildings.find((b) => b.id === id)?.name ?? '';
  const used = buildings.filter((b) => entries.some((e) => e.buildingId === b.id));

  return (
    <div className="prog">
      {used.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 20 }}>
          <Link className={`chip-btn${building ? '' : ' is-on'}`} href={`${base}/construction`} scroll={false}>{t('All')}</Link>
          {used.map((b) => (
            <Link key={b.id} className={`chip-btn${building === b.id ? ' is-on' : ''}`}
              href={`${base}/construction?building=${b.id}`} scroll={false}>{b.name}</Link>
          ))}
        </div>
      )}
      {!shown.length && <p className="muted">{t('No construction photos yet — ask the agent for the latest update.')}</p>}
      {shown.map((e) => {
        const label = [fmtMonth(e.month, lang), bname(e.buildingId)].filter(Boolean).join(' · ');
        return (
          <section key={e.id} className="prog__month">
            <h3 className="prog__title">{label}</h3>
            {e.note && <p className="small muted" style={{ margin: '4px 0 10px' }}>{e.note}</p>}
            <ProgressPhotos photos={e.photos} title={t('{name} construction, {when}', { name, when: label })} />
          </section>
        );
      })}
    </div>
  );
}

/** Сітка фото будівництва; клік відкриває повний розмір */
export async function ProgressPhotos({ photos, title, max }: { photos: string[]; title: string; max?: number }) {
  const t = makeT(await getLang());
  const list = max ? photos.slice(0, max) : photos;
  return (
    <div className="prog__grid">
      {list.map((p, i) => (
        <a key={`${i}-${p}`} href={p} target="_blank" rel="noreferrer" className="prog__ph">
          <Photo src={p} alt={t('{name} — photo {n}', { name: title, n: i + 1 })} />
          {max && i === list.length - 1 && photos.length > max && <span className="prog__more">+{photos.length - max}</span>}
        </a>
      ))}
    </div>
  );
}
