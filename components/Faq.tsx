import { getT } from '@/lib/i18n/server';
import Rich from './Rich';

/** Питання-відповіді на <details>: працює без JS, а відповіді лишаються в HTML для пошуковиків. Без перекладу лишається англійський текст. */
export default async function Faq({ items, open = 0 }: { items: { q: string; a: string }[]; open?: number }) {
  const t = await getT();
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} open={i < open}>
          <summary><h3>{t(f.q)}</h3></summary>
          <p><Rich text={t(f.a)} /></p>
        </details>
      ))}
    </div>
  );
}
