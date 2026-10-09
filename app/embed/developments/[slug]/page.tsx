import type { Metadata } from 'next';
import EmbedWidget, { type EmbedUnit } from '@/components/EmbedWidget';
import LangProvider from '@/components/LangProvider';
import { developmentContext, loadDevelopment } from '@/lib/developmentPage';
import { isLang, makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { trackAfterResponse } from '@/lib/track';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { fmtPrice } from '@/lib/format';
import { salesLabel } from '@/lib/units';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await loadDevelopment((await params).slug);
  return { title: d ? `${d.name} — availability | ${SITE_NAME}` : SITE_NAME };
}

/**
 * Віджет ЖК для сайту забудовника: шахматка по поверхах або список квартир і форма заявки.
 * Параметри: view=grid|list, lang=en|es (кукі мови в чужому iframe не доходять), form=0 — без форми.
 * Заявка йде звичайним /api/leads з позначкою source=widget.
 */
export default async function EmbedDevelopmentPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; lang?: string; form?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await developmentContext(slug);
  const { dev, units, buildings, from, leadUnit } = ctx;
  const lang = isLang(sp.lang) ? sp.lang : await getLang();
  const t = makeT(lang);
  await trackAfterResponse({ developmentId: dev.id }, 'dev_view', { utm: 'widget' });

  const names = new Map(buildings.map((b) => [b.id, b.name]));
  const list: EmbedUnit[] = units.map((u) => ({
    id: u.id, unitNo: u.unitNo, beds: u.beds, floor: u.floor, sqft: u.sqft, price: u.price,
    deal: u.deal, status: u.status,
    // назва дому — лише коли домів кілька: тоді шахматка ділиться на блоки
    building: buildings.length > 1 && u.buildingId ? names.get(u.buildingId) ?? '' : '',
  }));
  const hasFloors = list.some((u) => u.floor !== null);
  const view = sp.view === 'list' || !hasFloors ? 'list' : 'grid';
  const open = units.filter((u) => u.status === 'available').length;
  const pageUrl = `${SITE_URL}/developments/${dev.slug}?utm_source=widget`;

  return (
    <LangProvider lang={lang}>
      <div className="embed__head">
        <div>
          <h1 className="embed__title">{dev.name}</h1>
          <div className="small muted">
            {[dev.neighborhood && `${dev.neighborhood}, Roatán`, dev.completion && `${t('Completion')}: ${dev.completion}`]
              .filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="embed__sum">
          <span className={`dev__status dev__status--${dev.sales}`}><i aria-hidden /> {t(salesLabel(dev.sales))}</span>
          {from !== null && <b>{t('From')} {fmtPrice(from, 'sale', lang)}</b>}
          {units.length > 0 && <span className="tiny muted">{t('{n} of {total} available', { n: open, total: units.length })}</span>}
        </div>
      </div>

      <EmbedWidget units={list} view={hasFloors ? view : 'list'} canGrid={hasFloors}
        form={sp.form !== '0' && Boolean(leadUnit)} defaultUnitId={leadUnit?.id ?? ''}
        devName={dev.name} pageUrl={pageUrl} />

      <p className="embed__foot tiny muted">
        <a href={pageUrl} target="_blank" rel="noopener">{t('Full details, layouts and documents on {site}', { site: SITE_NAME })} ↗</a>
      </p>
    </LangProvider>
  );
}
