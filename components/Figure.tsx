import { getImageProps } from 'next/image';
import { preload } from 'react-dom';
import Rich from './Rich';
import type { Figure as F } from '@/lib/content/guides';

/**
 * Фото в гайді: звичайний <img> зі srcset з оптимізатора (як OptImg) і справжніми width/height,
 * щоб верстка не стрибала. Підпис з автором і ліцензією видно завжди, не в підказці.
 * Головне фото (eager) вантажимо одразу й першочергово, решту — ліниво.
 * Вертикальне фото не розтягуємо на всю колонку.
 */
/** wide — обкладинка на всю ширину сторінки над колонками (замість BlogCover). */
export default function Figure({ fig, eager, wide }: { fig: F; eager?: boolean; wide?: boolean }) {
  const portrait = fig.height > fig.width;
  const { props } = getImageProps({
    src: fig.src, alt: fig.alt, width: fig.width, height: fig.height,
    sizes: wide ? '(max-width: 1440px) 100vw, 1376px' : portrait ? '(max-width: 560px) 100vw, 420px' : '(max-width: 860px) 100vw, 780px',
  });
  if (eager) preload(props.src, { as: 'image', imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: 'high' });
  return (
    <figure className={`prose__fig${wide ? ' prose__fig--wide' : portrait ? ' prose__fig--portrait' : ''}`}>
      <img {...props} style={undefined} alt={fig.alt} loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined} />
      <figcaption className="small muted"><Rich text={fig.caption} /></figcaption>
    </figure>
  );
}
