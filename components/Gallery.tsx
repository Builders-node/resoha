'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Photo from './Photo';
import OptImg from './OptImg';
import { photoUrl } from '@/lib/format';
import { useT } from './LangProvider';

/**
 * Ширина плитки сітки (sizes) — як у CSS .gallery: на десктопі перша плитка 2fr з 4fr
 * (з 3fr, коли фото 2–3), на телефоні (≤860px) — дві колонки, перша на всю ширину.
 */
function tileSizes(i: number, n: number) {
  if (n === 1) return '(max-width: 1500px) 100vw, 1400px';
  const desk = i === 0 ? (n <= 3 ? 67 : 50) : (n <= 3 ? 33 : 25);
  const full = i === 0 || (n === 2 && i === 1) || (n === 4 && i === 3);
  return `(max-width: 860px) ${full ? 100 : 50}vw, (max-width: 1500px) ${desk}vw, ${desk * 14}px`;
}

/**
 * Фото обʼєкта: сітка з п'яти на сторінці і повноекранний перегляд усіх фото,
 * як у LUN — стрілки, свайп, клавіатура, лічильник «3 / 24» і стрічка мініатюр.
 */
export default function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const shown = photos.slice(0, 5);
  const more = photos.length - shown.length;

  if (!photos.length) {
    return (
      <div className="gallery gallery--empty">
        <Photo label="No photos yet — ask the agency for the full set" />
      </div>
    );
  }

  return (
    <>
      <div className={`gallery gallery--n${shown.length}`}>
        {shown.map((p, i) => (
          <button key={`${i}-${p}`} type="button" className="gallery__tile" onClick={() => setOpen(i)}
            aria-label={t('Open photo {n} of {total}', { n: i + 1, total: photos.length })}>
            <Photo src={p} alt={`${title} — ${t('photo {n}', { n: i + 1 })}`} eager={i === 0} sizes={tileSizes(i, shown.length)} />
            {i === shown.length - 1 && more > 0 && <span className="gallery__more">+{more}</span>}
          </button>
        ))}
        <button type="button" className="gallery__all" onClick={() => setOpen(0)}>
          <Icon name="camera" size={16} /> {photos.length === 1 ? t('1 photo') : t('All {n} photos', { n: photos.length })}
        </button>
      </div>
      {open !== null && <Lightbox photos={photos} title={title} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Повноекранний перегляд; captions — підпис до кожного фото (у фототурі — кімната). */
export function Lightbox({ photos, title, start, onClose, captions }: {
  photos: string[]; title: string; start: number; onClose: () => void; captions?: string[];
}) {
  const t = useT();
  const [i, setI] = useState(start);
  const n = photos.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const touch = useRef<number | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // сторінка під переглядом не має прокручуватись
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  // активна мініатюра завжди у видимій частині стрічки
  useEffect(() => {
    thumbs.current?.children[i]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [i]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} — ${t('photos')}`}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}>
      <div className="lightbox__bar">
        <span className="lightbox__count">
          {captions?.[i] && <b className="lightbox__caption">{captions[i]}</b>}
          {i + 1} / {n}
        </span>
        <button type="button" className="lightbox__close" onClick={onClose} aria-label={t('Close')}>
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="lightbox__stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {n > 1 && (
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t('Previous photo')}>‹</button>
        )}
        <OptImg src={photoUrl(photos[i])} alt={`${title} — ${t('photo {n}', { n: i + 1 })}`} width={1600} eager />
        {n > 1 && (
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t('Next photo')}>›</button>
        )}
      </div>
      {n > 1 && (
        <div className="lightbox__thumbs" ref={thumbs}>
          {photos.map((p, k) => (
            <button key={`${k}-${p}`} type="button" className={k === i ? 'is-on' : ''} onClick={() => setI(k)} aria-label={t('Photo {n}', { n: k + 1 })}>
              <OptImg src={photoUrl(p)} sizes="76px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
