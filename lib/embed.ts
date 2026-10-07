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
