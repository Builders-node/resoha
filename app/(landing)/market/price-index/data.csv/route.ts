import { priceStatsRows } from '@/lib/db';
import { buildPriceIndex, priceIndexCsv } from '@/lib/priceIndex';
import { yearAgo } from '@/lib/priceStats';

/** Дані «Індексу Hogarli» одним CSV — журналістам і дослідникам для власних графіків. */
export async function GET() {
  const ix = buildPriceIndex(await priceStatsRows(yearAgo()).catch(() => []));
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const body = priceIndexCsv(ix).map((r) => r.map(cell).join(',')).join('\n');
  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hogarli-price-index-${ix.month.slice(0, 7)}.csv"`,
    },
  });
}
