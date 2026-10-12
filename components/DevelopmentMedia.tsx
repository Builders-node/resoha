import Icon from './Icon';
import { embedUrl } from '@/lib/embed';
import { getT } from '@/lib/i18n/server';

/** Відео та тур 360 / облёт дроном. Відомі сервіси вбудовуємо, решту — посиланням. */
export default async function DevelopmentMedia({ video, tour, name }: { video: string; tour: string; name: string }) {
  const t = await getT();
  const items = [
    tour && { key: 'tour', url: tour, label: t('360° tour'), open: t('Open the 360° tour'), icon: 'orbit' as const },
    video && { key: 'video', url: video, label: t('Video'), open: t('Open the video'), icon: 'play' as const },
  ].filter(Boolean) as { key: string; url: string; label: string; open: string; icon: 'orbit' | 'play' }[];

  return (
    <div className="media">
      {items.map((m) => {
        const src = embedUrl(m.url);
        return (
          <figure key={m.key} className="media__item">
            {src ? (
              <div className="media__frame">
                <iframe src={src} title={`${name} — ${m.label}`} loading="lazy" allowFullScreen
                  allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking; picture-in-picture; encrypted-media" />
              </div>
            ) : (
              <a className="media__link" href={m.url} target="_blank" rel="noreferrer nofollow">
                <Icon name={m.icon} size={28} /> <span>{m.open}</span>
              </a>
            )}
            <figcaption className="small muted"><Icon name={m.icon} size={16} /> {m.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
