import Icon from './Icon';
import { embedUrl } from '@/lib/embed';

/** Відео та тур 360 / облёт дроном. Відомі сервіси вбудовуємо, решту — посиланням. */
export default function DevelopmentMedia({ video, tour, name }: { video: string; tour: string; name: string }) {
  const items = [
    tour && { key: 'tour', url: tour, label: '360° tour', icon: 'orbit' as const },
    video && { key: 'video', url: video, label: 'Video', icon: 'play' as const },
  ].filter(Boolean) as { key: string; url: string; label: string; icon: 'orbit' | 'play' }[];

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
                <Icon name={m.icon} size={28} /> <span>Open {m.label.toLowerCase()}</span>
              </a>
            )}
            <figcaption className="small muted"><Icon name={m.icon} size={16} /> {m.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
