import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { withinLimit } from '@/lib/guard';

/**
 * Допомога з описом у формі оголошення: написати чернетку з характеристик або перекласти опис
 * англійською ↔ іспанською. Працює лише з ANTHROPIC_API_KEY; без ключа кнопок у формі немає.
 */
export const maxDuration = 60;

const client = () => new Anthropic();

export async function GET() {
  return NextResponse.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Writing help is not set up' }, { status: 503 });
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  if (!(await withinLimit(req, 'assist', 30, 3600))) {
    return NextResponse.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === 'translate' ? 'translate' : 'write';
  const to = body.to === 'en' ? 'English' : 'Spanish (Honduras)';
  const text = String(body.text ?? '').slice(0, 6000);
  const facts = String(body.facts ?? '').slice(0, 3000);
  if (mode === 'translate' && !text.trim()) return NextResponse.json({ error: 'Write a description first' }, { status: 400 });

  const system = 'You write property listing descriptions for Hogarli, a real estate portal in Honduras. '
    + 'Write plain text only: no markdown, no headings, no emoji. Never invent facts that are not in the input: '
    + 'no distances, amenities, views or legal status unless given. Return only the description.';
  const prompt = mode === 'translate'
    ? `Translate this listing description into ${to}. Keep numbers, names and line breaks as they are.\n\n${text}`
    : `Write a listing description in ${body.lang === 'es' ? 'Spanish (Honduras)' : 'English'} of 90 to 160 words, `
      + `two or three short paragraphs, from these facts. Lead with what makes the property stand out.\n\n${facts}`
      + (text.trim() ? `\n\nThe agent's own notes, to keep and improve:\n${text}` : '');

  try {
    const res = await client().beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    if (res.stop_reason === 'refusal') return NextResponse.json({ error: 'Could not write this one. Please write it yourself.' }, { status: 422 });
    const out = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    if (!out) return NextResponse.json({ error: 'Could not write this one. Please try again.' }, { status: 502 });
    return NextResponse.json({ text: out });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'Writing help is busy. Try again in a minute.' }, { status: 429 });
    if (e instanceof Anthropic.APIError) {
      console.error('assist failed:', e.status, e.message);
      return NextResponse.json({ error: 'Writing help is unavailable right now' }, { status: 502 });
    }
    throw e;
  }
}
