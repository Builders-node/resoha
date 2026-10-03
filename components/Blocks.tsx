import Rich from './Rich';
import type { Block } from '@/lib/content/guides';

/** Тіло розділу гайда: абзаци, списки, таблиці й примітки. */
export default function Blocks({ body }: { body: Block[] }) {
  return (
    <>
      {body.map((b, i) => {
        if (typeof b === 'string') return <p key={i}><Rich text={b} /></p>;
        if ('note' in b) return <p key={i} className="prose__note"><Rich text={b.note} /></p>;
        if ('list' in b) {
          const items = b.list.map((t) => <li key={t}><Rich text={t} /></li>);
          return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        return (
          <div key={i} className="prose__table">
            <table className="table">
              <thead><tr>{b.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {b.table.rows.map((r) => (
                  <tr key={r[0]}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
