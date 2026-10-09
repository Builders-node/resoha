/**
 * Читання першого аркуша .xlsx у браузері без бібліотек: xlsx — це zip,
 * всередині XML. Розпаковуємо через DecompressionStream('deflate-raw'),
 * рядки беремо з sharedStrings.xml. Формули не рахуємо — лише збережені значення.
 */

const u16 = (b: DataView, o: number) => b.getUint16(o, true);
const u32 = (b: DataView, o: number) => b.getUint32(o, true);

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Усі файли архіву: імʼя → вміст (розпакований на вимогу) */
function readZip(buf: ArrayBuffer): Map<string, () => Promise<Uint8Array>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // кінець центрального каталогу шукаємо з хвоста: після нього може бути коментар
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not an .xlsx file');

  const files = new Map<string, () => Promise<Uint8Array>>();
  const names = new TextDecoder();
  let p = u32(view, eocd + 16);
  for (let n = u16(view, eocd + 10); n > 0; n--) {
    if (u32(view, p) !== 0x02014b50) break;
    const method = u16(view, p + 10);
    const size = u32(view, p + 20);
    const nameLen = u16(view, p + 28);
    const local = u32(view, p + 42);
    const name = names.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + u16(view, p + 30) + u16(view, p + 32);

    files.set(name, async () => {
      const start = local + 30 + u16(view, local + 26) + u16(view, local + 28);
      const raw = bytes.subarray(start, start + size);
      if (method === 0) return raw;
      if (method === 8) return inflate(raw);
      throw new Error(`Unsupported compression in ${name}`);
    });
  }
  return files;
}

const parseXml = (data: Uint8Array) =>
  new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml');
const all = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));

/** «AB12» → 27 (номер колонки з нуля) */
const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Таблиця першого аркуша: рядки → комірки текстом */
export async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const zip = readZip(buf);
  const read = async (name: string) => { const f = zip.get(name); return f ? parseXml(await f()) : null; };

  // перший аркуш за порядком у книзі, а не за імʼям файлу
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const [book, rels] = await Promise.all([read('xl/workbook.xml'), read('xl/_rels/workbook.xml.rels')]);
  const first = book && all(book, 'sheet')[0];
  const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const target = rid && rels ? all(rels, 'Relationship').find((r) => r.getAttribute('Id') === rid)?.getAttribute('Target') : null;
  if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  if (!zip.has(sheetPath)) sheetPath = [...zip.keys()].filter((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k)).sort()[0] ?? '';

  const sheet = sheetPath ? await read(sheetPath) : null;
  if (!sheet) throw new Error('The workbook has no sheets');

  const sst = await read('xl/sharedStrings.xml');
  const strings = sst ? all(sst, 'si').map((si) => all(si, 't').filter((t) => (t.parentNode as Element | null)?.localName !== 'rPh').map((t) => t.textContent ?? '').join('')) : [];

  const rows: string[][] = [];
  for (const row of all(sheet, 'row')) {
    const cells: string[] = [];
    all(row, 'c').forEach((c, i) => {
      const ref = c.getAttribute('r');
      const at = ref ? colIndex(ref) : i;
      const type = c.getAttribute('t');
      const v = all(c, 'v')[0]?.textContent ?? '';
      let text: string;
      if (type === 's') text = strings[Number(v)] ?? '';
      else if (type === 'inlineStr') text = all(c, 't').map((t) => t.textContent ?? '').join('');
      else if (type === 'b') text = v === '1' ? 'TRUE' : 'FALSE';
      else if (type !== 'str' && v !== '' && Number.isFinite(Number(v))) text = String(Math.round(Number(v) * 1e6) / 1e6);
      else text = v;
      cells[at] = text.trim();
    });
    const filled = Array.from(cells, (c) => c ?? '');
    if (filled.some(Boolean)) rows.push(filled);
  }
  return rows;
}
