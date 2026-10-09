'use client';
import Icon from './Icon';
import { useT } from './LangProvider';

/** PDF-буклет обʼєкта і друк сторінки (стилі друку — у globals.css, розділ «Друк») */
export default function ListingTools({ pdfHref, land = false }: { pdfHref: string; land?: boolean }) {
  const t = useT();
  return (
    <div className="ptools no-print">
      <a className="ptools__btn" href={pdfHref} target="_blank" rel="noreferrer">
        <Icon name="download" size={16} /> {land ? t('Land report (PDF)') : t('PDF booklet')}
      </a>
      <button type="button" className="ptools__btn" onClick={() => window.print()}>
        <Icon name="deed" size={16} /> {t('Print')}
      </button>
    </div>
  );
}
