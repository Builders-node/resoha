import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { OPERATOR, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Terms of use — ${SITE_NAME}`,
  description: 'The rules for using Resoha Roatán as a buyer, realtor or agency.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      lead={`${SITE_NAME} is operated by ${OPERATOR} (“Resoha”, “we”). By using the site you agree to these terms. They are short because the site is simple: it connects people looking for property on Roatán with the realtors who list it.`}
    >
      <section>
        <h2>1. What Resoha is — and is not</h2>
        <p>Resoha is a listing platform. We are <b>not</b> a real-estate broker, agent, lawyer or notary, and we are
          not a party to any sale, rental or other agreement you make with a realtor or owner. We do not hold money,
          do not take commission on deals and do not give legal, tax or investment advice.</p>
      </section>

      <section>
        <h2>2. Listings and their accuracy</h2>
        <p>Listings are published by realtors and agencies, or added by Resoha from a named public source that is
          shown on the listing. Prices, sizes, title status and every other detail come from that source. We check
          what we reasonably can, but we cannot guarantee any of it.</p>
        <p>The <b>“Land check”</b> on land listings and the <b>“Ready to build”</b> badge summarise answers given by
          the realtor or by Resoha staff on a given date. They are a starting point for your own due diligence, not
          a survey, a legal opinion or a guarantee. <b>Always verify the title at the Instituto de la Propiedad and
          take independent legal advice before paying a deposit.</b></p>
        <p>Foreign ownership of property in Honduras is subject to constitutional and statutory limits. Whether a
          given purchase is possible for you is a legal question for your lawyer, not for this site.</p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <ul>
          <li>You must be 18 or older and give accurate details. One person, one account.</li>
          <li>Keep your password to yourself; what happens under your account is your responsibility.</li>
          <li>Realtor and agency accounts must belong to people who actually sell or rent property on the island.
            A “Verified” badge means Resoha has seen a licence or ID; it is not an endorsement.</li>
          <li>We may suspend or close an account that breaks these terms, publishes false listings or abuses
            other users, and we may remove any listing or review at our discretion.</li>
        </ul>
      </section>

      <section>
        <h2>4. What you may not do</h2>
        <ul>
          <li>Publish listings for property you do not have the right to offer, or with made-up details or photos.</li>
          <li>Send spam, scrape the site, or use other people’s contact details for anything other than the enquiry
            they made.</li>
          <li>Post reviews you did not earn: reviews are limited to people who have actually contacted the realtor
            through Resoha.</li>
          <li>Try to get around rate limits, moderation or the security of the site.</li>
        </ul>
      </section>

      <section>
        <h2>5. Content you publish</h2>
        <p>You keep the rights to listings, photos and text you upload. You give Resoha permission to show them on
          the site, in search results, in link previews and in PDF reports generated from the listing, for as long
          as the listing is live. You confirm you have the right to publish them.</p>
      </section>

      <section>
        <h2>6. Enquiries and contact</h2>
        <p>When you send an enquiry or open WhatsApp from a listing, your details go to the realtor who holds it.
          How they respond, and what you agree with them, is between you and them. Realtors must use enquiry
          details only to answer that enquiry.</p>
      </section>

      <section>
        <h2>7. Availability and liability</h2>
        <p>The site is provided as is. We aim to keep it up, but it may be unavailable, change or close. To the extent
          the law allows, Resoha is not liable for losses arising from reliance on a listing, from a deal made with a
          realtor or owner, or from the site being unavailable. Nothing here limits liability that cannot be limited
          by law.</p>
      </section>

      <section>
        <h2>8. Law</h2>
        <p>These terms are governed by the laws of Honduras. Disputes are handled by the courts of Roatán, Bay
          Islands, unless the law gives you the right to another forum.</p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>We may update these terms. The date at the top shows the current version; continued use after a change
          means you accept it.</p>
      </section>
    </LegalPage>
  );
}
