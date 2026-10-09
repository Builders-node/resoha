import { developmentPdf } from '@/lib/developmentPdf';

/** Прайс ЖК у PDF: усі квартири з площами, цінами й статусом */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return developmentPdf((await params).slug, 'prices');
}
