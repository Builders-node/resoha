import Rich from './Rich';

/** Питання-відповіді на <details>: працює без JS, а відповіді лишаються в HTML для пошуковиків. */
export default function Faq({ items, open = 0 }: { items: { q: string; a: string }[]; open?: number }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} open={i < open}>
          <summary><h3>{f.q}</h3></summary>
          <p><Rich text={f.a} /></p>
        </details>
      ))}
    </div>
  );
}
