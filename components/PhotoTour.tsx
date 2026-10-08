'use client';
import { useState } from 'react';
import { Lightbox } from './Gallery';
import { useT } from './LangProvider';
import { photoUrl } from '@/lib/format';
import { roomLabel, type TourGroup } from '@/lib/rooms';

/**
 * Фототур, як у LUN: кожна кімната — плитка з чотирьох фото і назва під нею.
 * Клік відкриває перегляд усіх фото туру, починаючи з цієї кімнати.
 */
export default function PhotoTour({ groups, title }: { groups: TourGroup[]; title: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  if (!groups.length) return null;

  const photos = groups.flatMap((g) => g.photos);
  const captions = groups.flatMap((g) => g.photos.map(() => t(roomLabel(g.room))));
  const starts = groups.map((_, k) => groups.slice(0, k).reduce((n, g) => n + g.photos.length, 0));

  return (
    <section className="tour" id="photo-tour">
      <h3 className="prop__h">{t('Photo tour')}</h3>
      <div className="tour__grid">
        {groups.map((g, k) => {
          const shown = g.photos.slice(0, 4);
          const label = t(roomLabel(g.room));
          return (
            <button key={g.room} type="button" className="tour__item" onClick={() => setOpen(starts[k])}
              aria-label={t('{room}: {n} photos', { room: label, n: g.photos.length })}>
              <span className={`tour__tile tour__tile--n${shown.length}`}>
                {shown.map((p, i) => <img key={`${i}-${p}`} src={photoUrl(p)} alt="" loading="lazy" />)}
              </span>
              <span className="tour__name">{label}</span>
            </button>
          );
        })}
      </div>
      {open !== null && (
        <Lightbox photos={photos} captions={captions} title={title} start={open} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
