import type { Metadata } from 'next';

/**
 * Віджети для чужих сайтів (у <iframe>): без шапки й підвалу сайту — лише root layout.
 * Дозвіл на вбудовування — заголовки для /embed/* у next.config.ts.
 */
export const metadata: Metadata = {
  // копія сторінки ЖК на сайті забудовника — у пошуку має бути сама сторінка ЖК
  robots: { index: false, follow: true },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <main className="embed">{children}</main>;
}
