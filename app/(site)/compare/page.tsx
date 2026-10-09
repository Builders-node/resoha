import type { Metadata } from 'next';
import CompareTable from '@/components/CompareTable';
import { SITE_NAME } from '@/lib/site';

// набір обʼєктів живе в браузері відвідувача — сторінка без власного змісту, не індексуємо
export const metadata: Metadata = {
  title: `Compare listings | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return <CompareTable />;
}
