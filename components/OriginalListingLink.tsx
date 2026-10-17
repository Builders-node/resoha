'use client';
import { gaLead } from '@/lib/gtag';

/** Посилання на оголошення в агенції-джерелі: перехід туди — теж звернення (generate_lead у GA4). */
export default function OriginalListingLink({ href, listingId, agentId, price, children }: {
  href: string; listingId: string; agentId: string; price: number; children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer nofollow"
      onClick={() => gaLead('agency_link', { listingId, agentId, price })}>{children}</a>
  );
}
