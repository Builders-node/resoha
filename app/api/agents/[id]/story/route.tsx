import { ImageResponse } from 'next/og';
import { loadRanking, periodLabel } from '@/lib/agentRanking';
import { getAgent } from '@/lib/db';
import { isLang, makeT } from '@/lib/i18n';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';

const size = { width: 1080, height: 1920 };

/**
 * Картинка для сторіс Instagram і WhatsApp (1080×1920): місце в рейтингу «Агент місяця»
 * або, поза топом, «Знайдіть мої обʼєкти на Hogarli». Мова — ?lang=en|es, за замовчуванням es.
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

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '140px 96px', background: top ? '#131316' : '#fff1e8', color: top ? '#ffffff' : '#0f0f10',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 52, fontWeight: 700 }}>
          <svg width="96" height="90" viewBox={LOGO_VIEWBOX}><path d={LOGO_PATH} fill="#ff4800" /></svg>
          <span>Hogarli</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#ff4800', letterSpacing: 4, textTransform: 'uppercase' }}>
            {top ? t('Top agent of the month') : t('Find my listings on Hogarli')}
          </div>
          {top && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
              <span style={{ fontSize: 300, fontWeight: 800, lineHeight: 1, letterSpacing: -12 }}>#{me!.rank}</span>
              <span style={{ fontSize: 56, opacity: 0.8 }}>{periodLabel(period!, lang, true)}</span>
            </div>
          )}
          <div style={{ display: 'flex', fontSize: agent.name.length > 22 ? 84 : 104, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>
            {agent.name}
          </div>
          <div style={{ display: 'flex', fontSize: 48, opacity: 0.75 }}>
            {agent.agency || t('Independent agent')}
          </div>
          {me && (
            <div style={{ display: 'flex', fontSize: 44, opacity: 0.85 }}>
              {t('{n} listings · {s}/100 points', { n: me.listings, s: me.score })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 700 }}>
          hogarli.com/agents/top
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
  );
}
