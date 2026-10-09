import { developmentPdf } from '@/lib/developmentPdf';

/** Буклет ЖК у PDF: обкладинка, характеристики, план оплати, фото й прайс */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return developmentPdf((await params).slug, 'booklet');
}
