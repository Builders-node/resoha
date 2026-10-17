'use client';
import { getImageProps } from 'next/image';

/** Через оптимізатор пускаємо лише https і локальні шляхи; //host і http лишаються як є. */
const optimizable = (url: string) => url.startsWith('https://') || (url.startsWith('/') && !url.startsWith('//'));

/** Оптимізатор не зміг (сайт агенції не віддав фото тощо) — показуємо оригінал напряму. */
function fallback(img: HTMLImageElement, orig: string) {
  if (img.getAttribute('src') === orig) return;
  img.removeAttribute('srcset');
  img.setAttribute('src', orig);
}

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Яку ширину фото займає на сторінці — з неї браузер обирає розмір зі srcset. */
  sizes?: string;
  /**
   * Замість sizes: srcset 1x/2x від цієї ширини. Для <img> з width:auto — так розмір
   * на екрані лишається природним, а не дорівнює sizes.
   */
  width?: number;
  /** Головне фото сторінки (LCP): вантажимо одразу й першочергово. */
  eager?: boolean;
};

/**
 * Звичайний <img>, але src/srcSet ведуть на /_next/image: AVIF/WebP під потрібну ширину.
 * Розмітка й класи ті самі, що й раніше, — розміри задає CSS, а не next/image.
 */
export default function OptImg({ src, alt = '', className, sizes, width = 1080, eager }: Props) {
  const loading = eager ? 'eager' : 'lazy';
  if (!optimizable(src)) {
    return <img className={className} src={src} alt={alt} loading={loading} />;
  }
  // fill і height — лише щоб next/image не вимагав розмірів; їхні атрибути й стилі не беремо
  const { props } = getImageProps(sizes ? { src, alt, fill: true, sizes } : { src, alt, width, height: width });
  return (
    <img
      className={className}
      alt={alt}
      loading={loading}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      sizes={props.sizes}
      srcSet={props.srcSet}
      src={props.src}
      onError={(e) => fallback(e.currentTarget, src)}
      // помилка могла статись ще до гідрації — тоді onError React уже не побачить;
      // currentSrc порожній у лінивого фото, яке ще не почало вантажитись
      ref={(img) => { if (img?.complete && img.currentSrc && !img.naturalWidth) fallback(img, src); }}
    />
  );
}
