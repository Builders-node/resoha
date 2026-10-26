import Icon from './Icon';
import Rich from './Rich';
import type { Lang } from '@/lib/i18n';
import { homeSeo, type SeoBlock } from '@/lib/content/homeSeo';

/**
 * Великий SEO-текст унизу головної. Видно заголовок і перший абзац, решта — під «Read more».
 * <details> працює без JS, і весь текст лишається в HTML для пошуковиків.
 */
export default function HomeSeoText({ lang, lp }: { lang: Lang; lp: (href: string) => string }) {
  const c = homeSeo(lang);
  // посилання в тексті — без мовного префікса; на іспанській додаємо /es
  const loc = (text: string) => text.replace(/\]\((\/[^)]*)\)/g, (_, href: string) => `](${lp(href)})`);

  const block = (b: SeoBlock, i: number) => {
    if ('h' in b) return <h3 key={i}>{b.h}</h3>;
    if ('p' in b) return <p key={i}><Rich text={loc(b.p)} /></p>;
    if ('list' in b) return <ul key={i}>{b.list.map((li) => <li key={li}><Rich text={loc(li)} /></li>)}</ul>;
    return (
      <dl key={i} className="seo-text__faq">
        {b.faq.map((f) => (
          <div key={f.q}><dt>{f.q}</dt><dd><Rich text={loc(f.a)} /></dd></div>
        ))}
      </dl>
    );
  };

  return (
    <section className="section">
      <div className="wrap seo-text">
        <h2>{c.title} <span>{c.titleTail}</span></h2>
        <p className="seo-text__lead"><Rich text={loc(c.lead)} /></p>
        <details>
          <summary className="btn btn--ghost">
            <span className="seo-text__more">{c.more}</span>
            <span className="seo-text__less">{c.less}</span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="seo-text__body">{c.body.map(block)}</div>
        </details>
      </div>
    </section>
  );
}
