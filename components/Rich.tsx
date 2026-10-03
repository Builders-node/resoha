import Link from 'next/link';
import { Fragment } from 'react';

/**
 * Мінімальна розмітка для текстів гайдів: `[текст](/шлях)` і `**жирний**`.
 * Повноцінний markdown тут не потрібен, а з ним прийшла б зайва залежність.
 */
const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

export default function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      out.push(href.startsWith('/')
        ? <Link key={m.index} className="link-accent" href={href}>{m[1]}</Link>
        : <a key={m.index} className="link-accent" href={href} target="_blank" rel="noopener">{m[1]}</a>);
    } else {
      out.push(<b key={m.index}>{m[3]}</b>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

/** Той самий текст без розмітки — для meta description і JSON-LD. */
export const plain = (text: string) => text.replace(TOKEN, (_, t, _h, b) => t ?? b);
