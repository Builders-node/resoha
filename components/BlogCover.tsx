import Icon from './Icon';
import { topicBySlug, type Topic } from '@/lib/content/blog';

/**
 * Обкладинка статті без фото: градієнт рубрики, хвилі й велика іконка. Один стиль на весь блог,
 * жодних файлів, а соцмережі отримують ту саму картинку з opengraph-image.
 */
export default function BlogCover({ topic, label, icon: own, size = 'card' }: { topic: Topic; label: string; icon?: string; size?: 'card' | 'feature' | 'wide' | 'thumb' }) {
  const icon = own ?? topicBySlug(topic)?.icon ?? 'deed';
  return (
    <div className={`blog-cover blog-cover--${topic} blog-cover--${size}`} aria-hidden="true">
      <svg className="blog-cover__waves" viewBox="0 0 400 225" preserveAspectRatio="none">
        <path d="M0 150c50-22 100-22 150 0s100 22 150 0 70-20 100-8" />
        <path d="M0 178c50-22 100-22 150 0s100 22 150 0 70-20 100-8" />
        <path d="M0 206c50-22 100-22 150 0s100 22 150 0 70-20 100-8" />
      </svg>
      <span className="blog-cover__icon"><Icon name={icon} size={size === 'thumb' ? 48 : size === 'card' ? 84 : 132} strokeWidth={1.2} /></span>
      {/* на мініатюрі рубрика не влазить, її видно у вкладках */}
      {size !== 'thumb' && <span className="blog-cover__kicker">{label}</span>}
    </div>
  );
}
