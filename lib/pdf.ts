import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import { NextResponse } from 'next/server';
import { SITE_NAME, SITE_URL } from './site';

/**
 * Спільний «верстальник» PDF на pdf-lib: паспорт ділянки, буклет обʼєкта, буклет і прайс ЖК.
 * Аркуш A4, темна шапка з назвою сайту, текст із переносами, перенос на нову сторінку,
 * фото (лише JPEG/PNG — інше pdf-lib не вміє) і таблиці з повтором заголовка.
 */

export const INK = rgb(0.075, 0.075, 0.086);
export const MUTED = rgb(0.42, 0.42, 0.47);
export const LINE = rgb(0.9, 0.9, 0.92);
export const SOFT = rgb(0.96, 0.96, 0.97);
export const ORANGE = rgb(1, 0.28, 0);
export const TONE = { ok: rgb(0.09, 0.4, 0.2), warn: rgb(0.57, 0.25, 0.05), bad: rgb(0.6, 0.1, 0.1), muted: MUTED };

const W = 595, H = 842, M = 48, HEAD = 64, FOOT = 34;

export type Col = { label: string; width: number; align?: 'left' | 'right' };

export class Booklet {
  readonly W = W; readonly H = H; readonly M = M;
  /** Ширина набору між полями */
  readonly inner = W - 2 * M;
  page!: PDFPage;
  y = 0;
  private chars: Set<number>;
  private images = new Map<string, PDFImage | null>();

  private constructor(readonly pdf: PDFDocument, readonly reg: PDFFont, readonly bold: PDFFont, readonly kicker: string) {
    this.chars = new Set(reg.getCharacterSet());
  }

  static async create(title: string, kicker: string) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.setAuthor(SITE_NAME);
    pdf.setCreator(SITE_NAME);
    const [reg, bold] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
    const b = new Booklet(pdf, reg, bold, kicker);
    b.addPage();
    return b;
  }

  /** Стандартні шрифти PDF знають лише WinAnsi: лапки й тире міняємо на близькі, решту — на «?». */
  safe(s: string) {
    const t = s.replace(/[“”«»„]/g, '"').replace(/[‘’‚]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...')
      .replace(/ | /g, ' ').replace(/[\r\t]/g, ' ');
    let out = '';
    for (const ch of t) out += ch === '\n' || this.chars.has(ch.codePointAt(0)!) ? ch : '?';
    return out;
  }

  addPage() {
    this.page = this.pdf.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: H - HEAD, width: W, height: HEAD, color: INK });
    this.page.drawText('RESOHA ROATAN', { x: M, y: H - 40, size: 14, font: this.bold, color: rgb(1, 1, 1) });
    const k = this.safe(this.kicker.toUpperCase());
    this.page.drawText(k, { x: W - M - this.bold.widthOfTextAtSize(k, 11), y: H - 40, size: 11, font: this.bold, color: ORANGE });
    this.y = H - HEAD - 36;
  }

  /** Чи влізе ще h пунктів; ні — нова сторінка */
  need(h: number) {
    if (this.y - h < M + FOOT) this.addPage();
  }

  width(s: string, size: number, font = this.reg) {
    return font.widthOfTextAtSize(this.safe(s), size);
  }

  text(s: string, x: number, size: number, font = this.reg, color: RGB = INK) {
    this.page.drawText(this.safe(s), { x, y: this.y, size, font, color });
  }

  /** Текст, вирівняний по правому краю (right — координата краю) */
  right(s: string, size: number, font = this.bold, color: RGB = INK, right = W - M) {
    this.text(s, right - this.width(s, size, font), size, font, color);
  }

  wrap(s: string, size: number, maxWidth = this.inner, font = this.reg) {
    const out: string[] = [];
    for (const para of this.safe(s).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > maxWidth && line) { out.push(line); line = word; } else line = next;
      }
      out.push(line);
    }
    // зайві порожні рядки поспіль нічого не додають
    return out.filter((l, i) => l || (i > 0 && out[i - 1]));
  }

  /** Обрізати рядок до ширини, додавши «...» */
  clip(s: string, size: number, maxWidth: number, font = this.reg) {
    let t = this.safe(s);
    if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
    while (t && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
  }

  heading(s: string, size = 14) {
    this.need(size + 30);
    this.text(s, M, size, this.bold);
    this.y -= size + 8;
  }

  paragraph(s: string, size = 10.5, { maxLines = Infinity, color = INK, font = this.reg, gap = 10 } = {}) {
    const lh = size * 1.38;
    const lines = this.wrap(s, size, this.inner, font);
    const shown = lines.slice(0, maxLines);
    if (lines.length > shown.length && shown.length) shown[shown.length - 1] = this.clip(`${shown[shown.length - 1]}...`, size, this.inner, font);
    for (const l of shown) { this.need(lh); this.text(l, M, size, font, color); this.y -= lh; }
    this.y -= gap;
  }

  /** Рядок «назва … значення» з тонкою лінією зверху */
  row(label: string, value: string, { size = 10.5, color = INK }: { size?: number; color?: RGB } = {}) {
    const maxV = this.inner - Math.min(200, this.width(label, size) + 24);
    const lines = this.wrap(value, size, maxV, this.bold);
    this.need(lines.length * (size + 5) + 8);
    this.page.drawLine({ start: { x: M, y: this.y + size + 5 }, end: { x: W - M, y: this.y + size + 5 }, thickness: 0.5, color: LINE });
    this.text(label, M, size, this.reg, MUTED);
    for (const l of lines) { this.right(l, size, this.bold, color); this.y -= size + 5; }
    this.y -= 3;
  }

  /** Ряд плиток «підпис / велике значення» на всю ширину */
  tiles(items: [label: string, value: string, sub?: string][]) {
    if (!items.length) return;
    const gap = 8, w = (this.inner - gap * (items.length - 1)) / items.length, h = 52;
    this.need(h + 12);
    const top = this.y + 12;
    items.forEach(([label, value, sub], i) => {
      const x = M + i * (w + gap);
      this.page.drawRectangle({ x, y: top - h, width: w, height: h, color: SOFT, borderColor: LINE, borderWidth: 0.6 });
      this.page.drawText(this.clip(label.toUpperCase(), 7.5, w - 16), { x: x + 8, y: top - 15, size: 7.5, font: this.bold, color: MUTED });
      this.page.drawText(this.clip(value, 13, w - 16, this.bold), { x: x + 8, y: top - 33, size: 13, font: this.bold, color: INK });
      if (sub) this.page.drawText(this.clip(sub, 8, w - 16), { x: x + 8, y: top - 46, size: 8, font: this.reg, color: MUTED });
    });
    this.y = top - h - 18;
  }

  /** Завантажити фото; null — немає, не JPEG/PNG або не відповіло вчасно */
  async image(src: string | undefined | null): Promise<PDFImage | null> {
    if (!src || !(src.startsWith('/') || src.startsWith('http'))) return null;
    const url = src.startsWith('/') ? `${SITE_URL}${src}` : src;
    if (this.images.has(url)) return this.images.get(url)!;
    let img: PDFImage | null = null;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes[0] === 0xff && bytes[1] === 0xd8) img = await this.pdf.embedJpg(bytes);
        else if (bytes[0] === 0x89 && bytes[1] === 0x50) img = await this.pdf.embedPng(bytes);
      }
    } catch { /* фото не обовʼязкове — буклет без нього все одно корисний */ }
    this.images.set(url, img);
    return img;
  }

  /** Вписати фото в рамку w×h, притиснувши до верху; повертає, чи намалювали */
  drawImage(img: PDFImage | null, x: number, top: number, w: number, h: number) {
    if (!img) return false;
    const k = Math.min(w / img.width, h / img.height);
    const iw = img.width * k, ih = img.height * k;
    this.page.drawRectangle({ x, y: top - h, width: w, height: h, color: SOFT });
    this.page.drawImage(img, { x: x + (w - iw) / 2, y: top - h + (h - ih) / 2, width: iw, height: ih });
    return true;
  }

  /** Велике фото на всю ширину */
  async hero(src: string | undefined | null, h = 260) {
    const img = await this.image(src);
    if (!img) return;
    this.need(h + 10);
    this.drawImage(img, M, this.y + 8, this.inner, h);
    this.y -= h + 10;
  }

  /** Сітка фото у дві колонки */
  async photoGrid(srcs: string[], h = 170) {
    const imgs = (await Promise.all(srcs.map((s) => this.image(s)))).filter(Boolean) as PDFImage[];
    const gap = 10, w = (this.inner - gap) / 2;
    for (let i = 0; i < imgs.length; i += 2) {
      this.need(h + gap);
      const top = this.y + 8;
      this.drawImage(imgs[i], M, top, w, h);
      if (imgs[i + 1]) this.drawImage(imgs[i + 1], M + w + gap, top, w, h);
      this.y -= h + gap;
    }
    if (imgs.length) this.y -= 6;
  }

  /** Таблиця; заголовок повторюється на кожній новій сторінці. muted — рядок сірим (напр. продано) */
  table(cols: Col[], rows: { cells: string[]; muted?: boolean; bold?: boolean }[], size = 9) {
    const total = cols.reduce((s, c) => s + c.width, 0);
    const k = this.inner / total;
    const xs: number[] = [];
    cols.reduce((x, c) => { xs.push(x); return x + c.width * k; }, M);
    const rh = size + 9;
    const head = () => {
      this.need(rh * 2);
      this.page.drawRectangle({ x: M, y: this.y - 5, width: this.inner, height: rh, color: SOFT });
      cols.forEach((c, i) => {
        const label = this.clip(c.label.toUpperCase(), size - 1.5, c.width * k - 8, this.bold);
        const x = c.align === 'right' ? xs[i] + c.width * k - 4 - this.bold.widthOfTextAtSize(label, size - 1.5) : xs[i] + 7;
        this.page.drawText(label, { x, y: this.y, size: size - 1.5, font: this.bold, color: MUTED });
      });
      this.y -= rh;
    };
    head();
    for (const r of rows) {
      if (this.y - rh < M + FOOT) { this.addPage(); head(); }
      const font = r.bold ? this.bold : this.reg;
      cols.forEach((c, i) => {
        const v = this.clip(r.cells[i] ?? '', size, c.width * k - 8, font);
        const x = c.align === 'right' ? xs[i] + c.width * k - 4 - font.widthOfTextAtSize(v, size) : xs[i] + 7;
        this.page.drawText(v, { x, y: this.y, size, font, color: r.muted ? MUTED : INK });
      });
      this.page.drawLine({ start: { x: M, y: this.y - 5 }, end: { x: W - M, y: this.y - 5 }, thickness: 0.4, color: LINE });
      this.y -= rh;
    }
    this.y -= 10;
  }

  /** Примітка внизу кожної сторінки і номери сторінок */
  private finish(note: string) {
    const pages = this.pdf.getPages();
    const lines = this.wrap(note, 7.5, this.inner - 60);
    pages.forEach((p, i) => {
      let fy = M - 18 + (lines.length - 1) * 9.5;
      for (const l of lines) { p.drawText(l, { x: M, y: fy, size: 7.5, font: this.reg, color: MUTED }); fy -= 9.5; }
      if (pages.length > 1) {
        const n = `${i + 1} / ${pages.length}`;
        p.drawText(n, { x: W - M - this.reg.widthOfTextAtSize(n, 8), y: M - 18, size: 8, font: this.reg, color: MUTED });
      }
    });
  }

  async response(filename: string, note: string) {
    this.finish(note);
    const bytes = await this.pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename.replace(/[^\w.-]/g, '-')}"`,
        'Cache-Control': 'private, max-age=0',
      },
    });
  }
}
