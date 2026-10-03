import type { Source } from '@/lib/content/sources';

/** Список джерел під текстом: без нього цифри на сторінці нема чим перевірити. */
export default function SourceList({ sources }: { sources: Source[] }) {
  const unique = [...new Map(sources.map((s) => [s.url, s])).values()];
  return (
    <ol className="sources small">
      {unique.map((s) => (
        <li key={s.url}>
          <a className="link-accent" href={s.url} target="_blank" rel="noopener">{s.name}</a>
          <span className="muted">: {s.title}</span>
        </li>
      ))}
    </ol>
  );
}
