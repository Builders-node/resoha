'use client';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useT } from './LangProvider';

/**
 * Повернення на попередній екран. Якщо історії немає — коли сторінку відкрили
 * прямим посиланням — веде у відповідний розділ, а не в глухий кут.
 */
export default function BackButton({
  fallback = '/listings?deal=sale',
  variant = 'float',
  label = 'Back',
}: { fallback?: string; variant?: 'float' | 'inline'; label?: string }) {
  const router = useRouter();
  const t = useT();
  const text = t(label);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  };

  return (
    <button className={`back-btn back-btn--${variant}`} onClick={goBack} aria-label={text} title={text}>
      <Icon name="arrowLeft" size={variant === 'float' ? 21 : 17} />
      {variant === 'inline' && <span>{text}</span>}
    </button>
  );
}
