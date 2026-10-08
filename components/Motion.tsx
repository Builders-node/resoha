'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Що «випливає» при прокрутці: картки, плитки, заголовки секцій, блоки лендингу.
 * Таблиці кабінету й форми не чіпаємо — там анімація лише заважає працювати.
 */
const REVEAL = [
  '.section__head', '.grid > *', '.tiles > *', '.specs > *', '.stats > *', '.land', '.promo',
  '.area-card', '.guide-card', '.lp-topic', '.lp-sec__head', '.lp-qa', '.lp-cta__in',
].join(',');

/** Прокрутка списку поруч із картою живе у власному контейнері, а не у вікні. */
const scrollerOf = (el: Element): Element | Window => el.closest('.split__list') ?? window;

/**
 * Рух на всій платформі з одного місця, на GSAP:
 *  - перехід між сторінками — короткий підйом і проявлення вмісту;
 *  - блоки нижче першого екрана проявляються, коли до них доходить прокрутка;
 *  - картки, що підвантажились пізніше (каталог, «ще»), зʼявляються каскадом.
 * Видиме на першому екрані при завантаженні не ховаємо: інакше сторінка блимне після гідратації.
 * Хто просив систему зменшити рух — не отримує нічого з цього.
 */
export default function Motion() {
  const pathname = usePathname();
  const first = useRef(true);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const seen = new WeakSet<Element>();
      const triggers: ScrollTrigger[] = [];

      const reveal = (els: Element[]) =>
        gsap.to(els, {
          autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, overwrite: true,
          clearProps: 'opacity,visibility,transform',
        });

      const setup = (els: Element[], fresh: boolean) => {
        const below = new Map<Element | Window, Element[]>();
        const inView: Element[] = [];
        for (const el of els) {
          if (seen.has(el) || el.closest('.modal')) continue;
          seen.add(el);
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue; // сховане (вкладки, мобільні варіанти)
          const scroller = scrollerOf(el);
          const bottom = scroller === window ? innerHeight : (scroller as Element).getBoundingClientRect().bottom;
          if (r.top > bottom) {
            const list = below.get(scroller) ?? [];
            list.push(el);
            below.set(scroller, list);
          } else if (fresh) inView.push(el);
        }
        if (inView.length) gsap.fromTo(inView, { autoAlpha: 0, y: 16 }, {
          autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05,
          clearProps: 'opacity,visibility,transform',
        });
        below.forEach((list, scroller) => {
          gsap.set(list, { autoAlpha: 0, y: 24 });
          triggers.push(...ScrollTrigger.batch(list, {
            scroller: scroller === window ? undefined : (scroller as Element),
            start: 'top 92%', once: true, onEnter: (batch) => reveal(batch),
          }));
        });
      };

      // Перехід між сторінками: лише при навігації, не при першому завантаженні.
      const main = document.querySelector('main');
      if (!first.current && main) {
        gsap.fromTo(main, { autoAlpha: 0, y: 10 }, {
          autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,visibility,transform',
        });
      }
      setup(gsap.utils.toArray<Element>(REVEAL), false);

      // Картки, що прийшли після першого рендеру: каталог, пагінація, вкладки.
      const mo = new MutationObserver((records) => {
        const added: Element[] = [];
        for (const rec of records) rec.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(REVEAL)) added.push(n);
          n.querySelectorAll(REVEAL).forEach((c) => added.push(c));
        });
        if (added.length) setup(added, true);
      });
      if (main) mo.observe(main, { childList: true, subtree: true });

      return () => {
        mo.disconnect();
        triggers.forEach((t) => t.kill());
      };
    });
    first.current = false;
    return () => mm.revert();
  }, { dependencies: [pathname] });

  return null;
}
