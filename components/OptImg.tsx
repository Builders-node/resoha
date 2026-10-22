'use client';
import { getImageProps } from 'next/image';
import { preload } from 'react-dom';
import { IMAGE_HOSTS } from '@/lib/imageHosts';

/** Через оптимізатор — локальні шляхи й https з дозволених хостів; решта лишається як є. */
function optimizable(url: string) {
  if (url.startsWith('/')) return !url.startsWith('//');
  if (!url.startsWith('https://')) return false;
  try { return IMAGE_HOSTS.includes(new URL(url).hostname); } catch { return false; }
}

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
    return <img className={className} src={src} alt={alt} loading={loading} fetchPriority={eager ? 'high' : undefined} />;
  }
  // fill і height — лише щоб next/image не вимагав розмірів; їхні атрибути й стилі не беремо
  const { props } = getImageProps(sizes ? { src, alt, fill: true, sizes } : { src, alt, width, height: width });
  // як priority у next/image: <link rel="preload"> у <head>, щоб браузер почав тягнути фото
  // ще до того, як дійде до <img> у розмітці
  if (eager) preload(props.src, { as: 'image', imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: 'high' });
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
