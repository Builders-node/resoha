import { getLang } from '@/lib/i18n/server';
import { localizeLd } from '@/lib/seo';

/**
 * schema.org розмітка. `<` екрануємо, щоб текст із бази (опис оголошення) не міг
 * закрити тег <script> раніше часу. На іспанській версії посилання й inLanguage
 * переводимо на /es (localizeLd), щоб розмітка збігалась з адресою сторінки.
 */
export default async function JsonLd({ data }: { data: object | object[] }) {
  const json = localizeLd(data, await getLang());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
    />
  );
}
