import Icon from './Icon';
import { photoUrl } from '@/lib/format';

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  /** Перше фото на сторінці об'єкта вантажимо одразу, решту — ліниво. */
  eager?: boolean;
  label?: string;
};

/**
 * Фото об'єкта. Показуємо тільки те, що справді завантажили, — інакше нейтральна
 * заглушка. Стокових картинок замість реальних фото тут не буває.
 */
export default function Photo({ src, alt = '', className = '', eager, label = 'No photo yet' }: Props) {
  const url = photoUrl(src);
  if (url) {
    return (
      <img className={className} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} />
    );
  }
  return (
    <span className={`nophoto ${className}`.trim()} role="img" aria-label={label || 'No photo yet'}>
      <Icon name="camera" size={20} />
      {label && <em>{label}</em>}
    </span>
  );
}
