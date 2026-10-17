'use client';
import Icon from './Icon';
import OptImg from './OptImg';
import { useT } from './LangProvider';
import { photoUrl } from '@/lib/format';

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  /** Перше фото на сторінці об'єкта вантажимо одразу, решту — ліниво. */
  eager?: boolean;
  /** Ширина фото на сторінці (атрибут sizes); за замовчуванням — картка в сітці. */
  sizes?: string;
  /** false — оригінал без оптимізатора: для <img> з width:auto, де srcset змінив би розмір. */
  optimize?: boolean;
  label?: string;
};

/** Картка в сітці: одна колонка на телефоні, дві на планшеті, далі — не ширше ~440px */
export const CARD_SIZES = '(max-width: 560px) 100vw, (max-width: 1080px) 50vw, 440px';

/**
 * Фото об'єкта. Показуємо тільки те, що справді завантажили, — інакше нейтральна
 * заглушка. Стокових картинок замість реальних фото тут не буває.
 */
export default function Photo({ src, alt = '', className = '', eager, sizes = CARD_SIZES, optimize = true, label = 'No photo yet' }: Props) {
  const t = useT();
  const url = photoUrl(src);
  if (url) {
    return optimize
      ? <OptImg className={className || undefined} src={url} alt={alt} sizes={sizes} eager={eager} />
      : <img className={className} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} />;
  }
  return (
    <span className={`nophoto ${className}`.trim()} role="img" aria-label={t(label || 'No photo yet')}>
      <Icon name="camera" size={20} />
      {label && <em>{t(label)}</em>}
    </span>
  );
}
