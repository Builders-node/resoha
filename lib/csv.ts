/**
 * Мінімальний CSV за RFC 4180: лапки, "" всередині лапок, переноси в комірці.
 * Роздільник угадуємо з першого рядка: кома, крапка з комою (Excel у Європі) або таб.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const nl = src.search(/\r?\n/);
  const head = nl < 0 ? src : src.slice(0, nl);
  const count = (ch: string) => head.split(ch).length - 1;
  const delim = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

/** Комірка для CSV-шаблону: лапки, якщо є роздільник, лапки чи перенос */
export const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
