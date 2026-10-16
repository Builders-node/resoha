'use client';
import { toast } from './Toaster';

/**
 * Готовий текст для копіювання: цитата «Індексу Hogarli» для журналістів, код бейджа агента.
 * Підписи передає сервер уже перекладеними.
 */
export default function CopyBox({ text, label, done, rows = 3 }: { text: string; label: string; done: string; rows?: number }) {
  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    const area = e.currentTarget.parentElement?.querySelector('textarea');
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      area?.select();
    }
  }
  return (
    <div className="copy-box">
      <textarea className="input copy-box__text" readOnly rows={rows} value={text} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn btn--ghost" onClick={copy}>{label}</button>
    </div>
  );
}
