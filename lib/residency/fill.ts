/**
 * Документи для резидентства в Гондурасі за шаблонами юристів (Inertia Advisory):
 *  - Carta Poder — доверенність клієнта на адвоката (ES + EN в одному файлі);
 *  - Cartas Migración — заява про продовження перебування + лист відповідальності (ES + EN).
 *
 * Шаблони в lib/residency/templates/*.docx — оригінали юристів, у яких жовті «[поля]» замінено
 * на {{ключі}}, а форми «el/la Sr./Sra.», «hondureño/a», «he/she» — на ключі роду.
 * Тут лише підставляємо текст у word/document.xml: верстка, шрифти й відступи юристів лишаються.
 * Паспортні дані ніде не зберігаємо — форма в адмінці віддає їх і одразу отримує файл.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type Gender = 'm' | 'f';
export type Marital = 'single' | 'married' | 'divorced' | 'widowed';
export type DocKind = 'poa' | 'letters';

export type Person = {
  name: string;
  gender: Gender;
  marital: Marital;
};

export type ResidencyInput = {
  client: Person & {
    surname: string;
    passport: string;
    /** повна адреса за кордоном, однаково в обох мовах */
    address: string;
    countryEs: string;
    countryEn: string;
    /** «estadounidense», «rusa» — після «con nacionalidad» (жін. рід) */
    natEsF: string;
    /** «estadounidense», «ruso» — після «Pasaporte» (чол. рід) */
    natEsM: string;
    /** «American» — «American passport number» */
    natEn: string;
    entryEs: string;
    entryEn: string;
  };
  attorney: Person & {
    bar: string;
    idNumber: string;
    city: string;
    phone: string;
    email: string;
  };
  /** місто в шапці листів до Migración */
  letterCity: string;
  /** YYYY-MM-DD */
  date: string;
};

const MARITAL: Record<Marital, { m: string; f: string; en: string }> = {
  single: { m: 'soltero', f: 'soltera', en: 'single' },
  married: { m: 'casado', f: 'casada', en: 'married' },
  divorced: { m: 'divorciado', f: 'divorciada', en: 'divorced' },
  widowed: { m: 'viudo', f: 'viuda', en: 'widowed' },
};

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** В англійському «a national of …» перед деякими країнами потрібен артикль. */
const EN_WITH_THE = /^(United States|United Kingdom|Netherlands|Bahamas|Dominican Republic|Czech Republic|Philippines|United Arab Emirates)\b/i;

/** Значення для кожного {{ключа}} у шаблонах. */
export function tokens(d: ResidencyInput): Record<string, string> {
  const c = d.client;
  const a = d.attorney;
  const cf = c.gender === 'f';
  const af = a.gender === 'f';
  const [y, m, day] = d.date.split('-').map(Number);
  return {
    client_name: c.name,
    client_surname: c.surname,
    client_marital_es: MARITAL[c.marital][c.gender],
    client_marital_en: MARITAL[c.marital].en,
    passport: c.passport,
    client_address: c.address,
    country_es: c.countryEs,
    country_en: c.countryEn,
    country_en_of: EN_WITH_THE.test(c.countryEn) ? `the ${c.countryEn}` : c.countryEn,
    nat_es_f: c.natEsF,
    nat_es_m: c.natEsM,
    nat_en: c.natEn,
    entry_es: c.entryEs,
    entry_en: c.entryEn,
    c_el_sr: cf ? 'la Sra.' : 'el Sr.',
    c_del_sr: cf ? 'de la Sra.' : 'del Sr.',
    c_autorizado: cf ? 'autorizada' : 'autorizado',
    c_mr: cf ? 'Ms.' : 'Mr.',
    c_He: cf ? 'She' : 'He',
    c_his: cf ? 'her' : 'his',

    att_name: a.name,
    att_marital_es: MARITAL[a.marital][a.gender],
    att_marital_en: MARITAL[a.marital].en,
    att_bar: a.bar,
    att_id: a.idNumber,
    att_city: a.city,
    att_phone: a.phone,
    att_email: a.email,
    a_del_abogado: af ? 'de la abogada' : 'del abogado',
    a_hondureno: af ? 'hondureña' : 'hondureño',
    a_inscrito: af ? 'inscrita' : 'inscrito',
    a_apoderado: af ? 'apoderada' : 'apoderado',
    a_he: af ? 'she' : 'he',
    a_him: af ? 'her' : 'him',

    letter_city: d.letterCity,
    day: String(day),
    month_es: MONTHS_ES[m - 1] ?? '',
    month_en: MONTHS_EN[m - 1] ?? '',
    year: String(y),
  };
}

/** Поля, без яких документ не можна віддавати на підпис. Повертає список того, чого бракує. */
export function missingFields(d: ResidencyInput, kind: DocKind): string[] {
  const c = d.client;
  const a = d.attorney;
  const need: [string, string][] = [
    ['Client full name', c.name], ['Passport number', c.passport], ['Address abroad', c.address],
    ['Attorney name', a.name], ['Attorney bar number', a.bar], ['Attorney phone', a.phone],
    ['Attorney e-mail', a.email], ['Attorney city', a.city], ['Attorney ID number', a.idNumber],
    ['Date', /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : ''],
  ];
  if (kind === 'poa') {
    need.push(['Nationality (ES, feminine)', c.natEsF], ['Nationality (ES, masculine)', c.natEsM],
      ['Nationality (EN)', c.natEn], ['Country (EN)', c.countryEn]);
  } else {
    need.push(['Client surname', c.surname], ['Country (ES)', c.countryEs], ['Country (EN)', c.countryEn],
      ['Point of entry (ES)', c.entryEs], ['Point of entry (EN)', c.entryEn], ['Letter city', d.letterCity]);
  }
  return need.filter(([, v]) => !v?.trim()).map(([label]) => label);
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Підставляє значення в docx-шаблон. Невідомий ключ — помилка: краще впасти, ніж віддати «{{…}}» на підпис. */
export function fillDocx(template: Uint8Array, values: Record<string, string>): Uint8Array {
  const files = unzipSync(template);
  const xml = strFromU8(files['word/document.xml']);
  const filled = xml.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`No value for template key ${key}`);
    return escapeXml(v.trim().replace(/\s+/g, ' '));
  });
  files['word/document.xml'] = strToU8(filled);
  return zipSync(files);
}
