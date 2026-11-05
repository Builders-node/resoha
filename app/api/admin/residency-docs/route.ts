import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { fillDocx, missingFields, tokens, type DocKind, type Gender, type Marital, type ResidencyInput } from '@/lib/residency/fill';
import { currentUser } from '@/lib/session';

const TEMPLATES: Record<DocKind, { file: string; name: string }> = {
  poa: { file: 'power-of-attorney.docx', name: 'Carta_Poder' },
  letters: { file: 'migration-letters.docx', name: 'Cartas_Migracion' },
};

const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 300) : '');
const gender = (v: unknown): Gender => (v === 'f' ? 'f' : 'm');
const marital = (v: unknown): Marital =>
  (v === 'married' || v === 'divorced' || v === 'widowed' ? v : 'single');

function parse(body: Record<string, unknown>): ResidencyInput {
  const c = (body.client ?? {}) as Record<string, unknown>;
  const a = (body.attorney ?? {}) as Record<string, unknown>;
  return {
    client: {
      name: str(c.name), surname: str(c.surname), gender: gender(c.gender), marital: marital(c.marital),
      passport: str(c.passport), address: str(c.address),
      countryEs: str(c.countryEs), countryEn: str(c.countryEn),
      natEsF: str(c.natEsF), natEsM: str(c.natEsM), natEn: str(c.natEn),
      entryEs: str(c.entryEs), entryEn: str(c.entryEn),
    },
    attorney: {
      name: str(a.name), gender: gender(a.gender), marital: marital(a.marital),
      bar: str(a.bar), idNumber: str(a.idNumber), city: str(a.city), phone: str(a.phone), email: str(a.email),
    },
    letterCity: str(body.letterCity),
    date: str(body.date),
  };
}

/**
 * Admin → Residency docs: заповнює шаблон юристів і одразу віддає .docx.
 * Нічого не пишемо ні в базу, ні в журнал: у запиті паспортні дані клієнта.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind: DocKind = body.doc === 'letters' ? 'letters' : 'poa';
  const input = parse(body);
  const missing = missingFields(input, kind);
  if (missing.length) return NextResponse.json({ error: `Fill in: ${missing.join(', ')}` }, { status: 400 });

  const t = TEMPLATES[kind];
  const template = await readFile(path.join(process.cwd(), 'lib/residency/templates', t.file));
  const docx = fillDocx(new Uint8Array(template), tokens(input));

  const who = (input.client.surname || input.client.name).normalize('NFD').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return new Response(Buffer.from(docx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${t.name}_${who || 'client'}.docx"`,
      'Cache-Control': 'no-store',
    },
  });
}
