'use client';
import Link from 'next/link';
import AuthLink from './AuthLink';
import Icon from './Icon';
import ListingCard from './ListingCard';
import { useT } from './LangProvider';
import { FAV_KEY, useIds, writeIds } from '@/lib/localLists';
import { useListingsByIds } from '@/lib/useListingsByIds';
import { useLp } from './useLp';

/** Збережене гостем: id з localStorage → картки. Вхід переносить їх в акаунт (GuestFavSync). */
export default function GuestSaved() {
  const lp = useLp();
  const t = useT();
  const ids = useIds(FAV_KEY);
  const { items, loading } = useListingsByIds(ids);

  return (
    <div className="wrap page-top section">
      <div className="section__head">
        <h1 style={{ fontSize: 'var(--fs-h1)' }}>{t('Saved listings')}</h1>
        {ids.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => writeIds(FAV_KEY, [])}>{t('Clear all')}</button>
        )}
        <p>{t('Saved on this device only.')}{' '}
          <AuthLink className="link-accent">{t('Sign in')}</AuthLink>{' '}
          {t('to keep them in your account and see them on any device.')}</p>
      </div>

      {ids.length === 0 ? (
        <div className="empty">
          <div className="empty__ico"><Icon name="heart" size={40} /></div>
          <p>{t('Nothing saved yet. Tap the heart on any listing to keep it here.')}</p>
          <Link className="btn btn--primary" href={lp('/listings?deal=sale')}>{t('Browse the listings')}</Link>
        </div>
      ) : loading && items.length === 0 ? (
        <p className="muted">{t('Loading…')}</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>{t('These listings are no longer on the market.')}</p>
          <Link className="btn btn--primary" href={lp('/listings?deal=sale')}>{t('Browse the listings')}</Link>
        </div>
      ) : (
        <div className="grid grid--4">
          {items.map((l) => <ListingCard key={l.id} listing={l} ratio="tall" />)}
        </div>
      )}
    </div>
  );
}
