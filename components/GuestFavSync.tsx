'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { FAV_KEY, readIds, writeIds } from '@/lib/localLists';

// StrictMode і повторні рендери сайдбару не мають запускати перенесення двічі
let running = false;

/**
 * Що гість зберіг у браузері, після входу один раз переїжджає в акаунт.
 * POST /api/favorites перемикає, тож спершу питаємо, що вже збережено, і шлемо лише нове.
 */
export default function GuestFavSync({ authed }: { authed: boolean }) {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!authed || running) return;
    const local = readIds(FAV_KEY);
    if (!local.length) return;
    running = true;
    (async () => {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) return;
        const { ids = [] } = (await res.json()) as { ids?: string[] };
        // гість міг бути сесією, що вже скінчилась: тоді GET віддає порожньо, і переносити нікуди
        const fresh = local.filter((id) => !ids.includes(id));
        let moved = 0;
        for (const listingId of fresh) {
          const r = await fetch('/api/favorites', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }),
          });
          if (r.status === 401) return;
          if (r.ok) moved++;
        }
        writeIds(FAV_KEY, []);
        if (moved) {
          toast(t('Listings saved on this device were added to your account'));
          router.refresh();
        }
      } catch {
        // мережа впала — спробуємо на наступному завантаженні сторінки
      } finally {
        running = false;
      }
    })();
  }, [authed, router, t]);

  return null;
}
