/**
 * Посилання на відео чи тур 360 → адреса для <iframe>.
 * Вбудовуємо лише відомі сервіси; решту показуємо звичайним посиланням.
 */
export function embedUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === 'my.matterport.com') {
    const m = u.searchParams.get('m');
    return m && /^[\w-]+$/.test(m) ? `https://my.matterport.com/show/?m=${m}` : null;
  }
  if (host === 'kuula.co') {
    const m = u.pathname.match(/^\/(?:post|share)\/(collection\/)?([\w-]+)/);
    return m ? `https://kuula.co/share/${m[1] ?? ''}${m[2]}?fs=1&vr=0&thumbs=1` : null;
  }
  return null;
}

/* ---------- віджет ЖК для сайту забудовника: /embed/developments/<slug> ---------- */

/** Тип повідомлення, яким віджет передає свою висоту сторінці-господарю */
export const EMBED_HEIGHT_MESSAGE = 'resoha:embed-height';

export type EmbedView = 'grid' | 'list';

export interface EmbedOptions {
  view?: EmbedView;
  lang?: 'en' | 'es';
  /** false — без форми заявки, лише наявність */
  form?: boolean;
}

/** Адреса віджета з параметрами; типові не пишемо, щоб посилання було коротким */
export function embedPath(slug: string, o: EmbedOptions = {}): string {
  const q = new URLSearchParams();
  if (o.view) q.set('view', o.view);
  if (o.lang && o.lang !== 'en') q.set('lang', o.lang);
  if (o.form === false) q.set('form', '0');
  const s = q.toString();
  return `/embed/developments/${encodeURIComponent(slug)}${s ? `?${s}` : ''}`;
}

/**
 * Код для сайту забудовника: <iframe> і крихітний скрипт, що підганяє висоту рамки
 * під вміст (віджет шле її через postMessage). Скрипт приймає повідомлення лише з нашого
 * домену й лише від рамки, що їх надіслала, — кілька віджетів на сторінці не заважають.
 */
export function embedSnippet(origin: string, slug: string, title: string, o: EmbedOptions = {}): string {
  const src = `${origin}${embedPath(slug, o)}`.replace(/&/g, '&amp;');
  const safeTitle = title.replace(/[<>&"]/g, '');
  return [
    `<iframe src="${src}" title="${safeTitle}" loading="lazy" style="width:100%;height:720px;border:0;display:block"></iframe>`,
    `<script>addEventListener("message",function(e){if(e.origin!=="${origin}"||!e.data||e.data.type!=="${EMBED_HEIGHT_MESSAGE}")return;`
      + `document.querySelectorAll("iframe").forEach(function(f){if(f.contentWindow===e.source)f.style.height=e.data.height+"px"})});</script>`,
  ].join('\n');
}
