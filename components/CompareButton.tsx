'use client';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { COMPARE_KEY, COMPARE_MAX, toggleCompare, useIds } from '@/lib/localLists';

/** Додати до порівняння: кружок на картці (як серце) або кнопка з підписом на сторінці обʼєкта. */
export default function CompareButton({ listingId, variant = 'card' }: { listingId: string; variant?: 'card' | 'page' }) {
  const t = useT();
  const on = useIds(COMPARE_KEY).includes(listingId);

  function toggle(e: React.MouseEvent) {
    // картка — це посилання: клік по кнопці не має відкривати оголошення
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCompare(listingId);
    if (res === null) toast(t('You can compare up to {n} listings. Remove one first.', { n: COMPARE_MAX }));
    else toast(res ? t('Added to compare') : t('Removed from compare'));
  }

  const label = on ? t('Remove from compare') : t('Add to compare');
  if (variant === 'page') {
    return (
      <button className={`btn btn--sm ${on ? 'btn--primary' : 'btn--ghost'} cmp-btn`} onClick={toggle} aria-pressed={on}>
        <Icon name="compare" size={17} /> {on ? t('In compare') : t('Compare')}
      </button>
    );
  }
  return (
    <button className={`cmp ${on ? 'is-on' : ''}`} onClick={toggle} aria-label={label} title={label} aria-pressed={on}>
      <Icon name="compare" size={17} />
    </button>
  );
}
