import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';

export const maxDuration = 60;

const MAX_BYTES = 30 * 1024 * 1024;

/** Внутрішні адреси (localhost, приватні мережі, метадані хмари) не тягнемо */
function privateIp(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return privateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function safeTarget(raw: string): Promise<URL | null> {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$|\.local$|\.internal$/i.test(host)) return null;
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null;
  return url;
}

/**
 * XML-фід агенції (Kyero v3) за посиланням. Браузер напряму його не прочитає (CORS),
 * тож сервер тягне файл і віддає потоком; розбирає його вже браузер.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });

  let target = await safeTarget(new URL(req.url).searchParams.get('url') ?? '');
  if (!target) return NextResponse.json({ error: 'Enter a public http(s) link to the feed' }, { status: 400 });

  // переадресації перевіряємо так само, як саме посилання
  let res: Response | null = null;
  for (let hop = 0; hop < 4 && target; hop++) {
    res = await fetch(target, {
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(25_000),
      headers: { Accept: 'application/xml, text/xml, */*', 'User-Agent': 'Resoha feed import' },
    }).catch(() => null);
    if (!res || res.status < 300 || res.status >= 400) break;
    const next = res.headers.get('location');
    target = next ? await safeTarget(new URL(next, target).toString()) : null;
    res = null;
  }
  if (!res) return NextResponse.json({ error: 'Could not download the feed' }, { status: 502 });
  if (!res.ok || !res.body) return NextResponse.json({ error: `The feed answered ${res.status}` }, { status: 502 });
  if (Number(res.headers.get('content-length')) > MAX_BYTES) return NextResponse.json({ error: 'The feed is over 30 MB' }, { status: 413 });

  // віддаємо потоком з обмеженням розміру: великий фід не впирається в ліміт тіла відповіді
  let seen = 0;
  const capped = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      seen += chunk.byteLength;
      if (seen > MAX_BYTES) ctl.error(new Error('Feed too large'));
      else ctl.enqueue(chunk);
    },
  }));
  return new Response(capped, { headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' } });
}
