'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useLang, useT } from './LangProvider';
import { fmtPrice, nListings } from '@/lib/format';
import { SEARCH_TABS, catalogHref, type SearchTab, type Suggestion } from '@/lib/searchTabs';

const GROUPS: Record<Suggestion['kind'], { title: string; icon: string }> = {
  area: { title: 'Areas', icon: 'pin' },
  development: { title: 'Developments', icon: 'building' },
  listing: { title: 'Listings', icon: 'home' },
};

/**
 * Пошук на головній, як рядок пошуку ЛУН: вкладки угоди, підказки (райони, ЖК, оголошення),
 * стрілки, Enter, Escape. Район веде в каталог із фільтром району, вільний текст — у каталог з q.
 */
export default function HomeSearch() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const listId = useId();
  const [tab, setTab] = useState<SearchTab>('sale');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // відповідь сервера разом із ключем запиту: старі відповіді не перетирають новіші
  const [result, setResult] = useState<{ key: string; items: Suggestion[] }>({ key: '', items: [] });
  const cache = useRef(new Map<string, Suggestion[]>());

  const key = `${tab}|${q.trim().toLowerCase()}`;
  const items = result.key === key ? result.items : [];

  useEffect(() => {
    if (!open) return;
    const hit = cache.current.get(key);
    let off = false;
    // з кешу — одразу, інакше після паузи в наборі (~250 мс)
    const timer = setTimeout(async () => {
      if (hit) { setResult({ key, items: hit }); return; }
      try {
        const res = await fetch(`/api/suggest?deal=${tab}&q=${encodeURIComponent(q.trim())}`);
        const data = (await res.json()) as { items?: Suggestion[] };
        cache.current.set(key, data.items ?? []);
        if (!off) { setResult({ key, items: data.items ?? [] }); setActive(-1); }
      } catch {
        if (!off) setResult({ key, items: [] });
      }
    }, hit ? 0 : 250);
    return () => { off = true; clearTimeout(timer); };
  }, [key, open, q, tab]);

  function go(s: Suggestion) {
    setOpen(false);
    router.push(s.href);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (open && active >= 0 && items[active]) return go(items[active]);
    const text = q.trim();
    setOpen(false);
    if (tab === 'new') {
      const dev = text && items.find((s) => s.kind === 'development');
      router.push(dev ? dev.href : '/developments');
      return;
    }
    // точна назва району — це фільтр району, а не пошук по тексту
    const area = items.find((s) => s.kind === 'area' && s.label.toLowerCase() === text.toLowerCase());
    router.push(area ? area.href : catalogHref(tab, { q: text }));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (!items.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // -1 — курсор у полі; з краю списку переходимо на інший край через поле
      setActive((i) => {
        const next = i + step;
        return next >= items.length ? -1 : next < -1 ? items.length - 1 : next;
      });
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); setActive(-1); }
    }
  }

  const showList = open && items.length > 0;
  const optId = (i: number) => `${listId}-opt-${i}`;

  return (
    <section className="wrap hsearch">
      <div className="hsearch__tabs" role="tablist" aria-label={t('What are you looking for?')}>
        {SEARCH_TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id}
            className={`chip-btn ${tab === x.id ? 'is-on' : ''}`}
            onClick={() => { setTab(x.id); setActive(-1); }}>
            {t(x.label)}
          </button>
        ))}
      </div>

      <form className="hsearch__form" role="search" onSubmit={submit}>
        <div className="hsearch__field">
          <Icon name="search" size={20} />
          <input
            className="hsearch__input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={tab === 'new' ? t('Development or developer') : t('Area, development or listing')}
            aria-label={t('Search')}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? optId(active) : undefined}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKey}
          />
          {showList && (
            <ul className="hsearch__list" id={listId} role="listbox">
              {items.map((s, i) => (
                <li key={`${s.kind}-${s.href}`} role="presentation">
                  {(i === 0 || items[i - 1].kind !== s.kind) && (
                    <div className="hsearch__group" aria-hidden="true">{t(GROUPS[s.kind].title)}</div>
                  )}
                  <div id={optId(i)} role="option" aria-selected={i === active}
                    className={`hsearch__opt ${i === active ? 'is-active' : ''}`}
                    // mousedown не забирає фокус з поля — інакше blur закрив би список раніше за клік
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s)}>
                    <span className="hsearch__ico"><Icon name={GROUPS[s.kind].icon} size={18} /></span>
                    <span className="hsearch__txt">
                      <b>{s.label}</b>
                      <span className="small muted">
                        {s.kind === 'area' ? (s.count ? nListings(s.count, lang) : '')
                          : s.kind === 'listing' ? `${s.sub} · ${fmtPrice(s.price, s.deal, lang)}` : s.sub}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn btn--orange btn--lg hsearch__go" type="submit" aria-label={t('Search')}>
          <Icon name="search" size={18} /> <span>{t('Search')}</span>
        </button>
      </form>
    </section>
  );
}
