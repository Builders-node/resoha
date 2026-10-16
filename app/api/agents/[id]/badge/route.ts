import { loadRanking, periodLabel } from '@/lib/agentRanking';
import { getAgent } from '@/lib/db';
import { isLang, makeT } from '@/lib/i18n';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Бейдж для сайту ріелтора: <img> у посиланні на його профіль на Hogarli.
 * Топ-3 минулого місяця бачать «Top agente · місяць · #місце», решта — «Agente en Hogarli».
 * Мова — ?lang=en|es, за замовчуванням іспанська: більшість сайтів агенцій іспаномовні.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = new URL(req.url).searchParams.get('lang');
  const lang = isLang(q) ? q : 'es';
  const t = makeT(lang);
  const agent = await getAgent(id).catch(() => null);
  if (!agent || agent.role !== 'agent') return new Response('Not found', { status: 404 });

  const { period, rows } = await loadRanking().catch(() => ({ period: null, rows: [] }));
  const me = rows.find((r) => r.agent.id === id);
  const top = Boolean(me?.top && period);
  const line1 = top ? t('Top agent · #{n}', { n: me!.rank }) : t('Agent on Hogarli');
  const line2 = top ? `${periodLabel(period!, lang)} · Hogarli` : t('See my listings');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72" viewBox="0 0 240 72" role="img" aria-label="${esc(`${line1}, ${line2}`)}">
<rect x="0.5" y="0.5" width="239" height="71" rx="12" fill="${top ? '#131316' : '#ffffff'}" stroke="${top ? '#131316' : '#e7e6ec'}"/>
<svg x="14" y="17" width="40" height="38" viewBox="${LOGO_VIEWBOX}"><path d="${LOGO_PATH}" fill="#ff4800"/></svg>
<text x="66" y="32" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="${top ? '#ffffff' : '#0f0f10'}">${esc(line1)}</text>
<text x="66" y="52" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="${top ? '#ffb38f' : '#6b6b73'}">${esc(line2)}</text>
</svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
