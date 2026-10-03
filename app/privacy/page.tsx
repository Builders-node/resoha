import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { OPERATOR, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Privacy policy — ${SITE_NAME}`,
  description: 'What Resoha Roatán collects, why, who sees it and how to have it removed.',
  alternates: { canonical: '/privacy' },
};

/**
 * Написано під те, що сайт справді робить. Якщо зʼявиться новий збір даних
 * (розсилка, аналітика, платежі) — сюди треба додати абзац, а не навпаки.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead={`${SITE_NAME} is a property marketplace for Roatán and the Bay Islands, operated by ${OPERATOR} (“Resoha”, “we”). This policy explains what we collect, why, who can see it and how to have it removed. It is written in plain language on purpose.`}
    >
      <section>
        <h2>1. What we collect</h2>
        <p><b>If you only browse</b>, we collect nothing that identifies you. Our servers keep standard access logs
          (IP address, browser, pages requested) for a short time to keep the site running and to stop abuse.</p>
        <p><b>If you send an enquiry on a listing</b>, we store the name, phone number, email and message you type,
          together with the listing and the agent it was sent to. If you tap “Message on WhatsApp”, we record that a
          visitor opened WhatsApp from that listing; the conversation itself happens in WhatsApp, not on Resoha.</p>
        <p><b>If you create an account</b>, we store your name, email address and password (stored only as a hash),
          and for realtors also your phone, WhatsApp number, agency, photo and the text you write about yourself.
          Buyer accounts also store saved listings and saved searches.</p>
        <p><b>If you sign in with Google</b>, Google sends us your name, email address and profile picture. We use
          them to create and show your account. We do not post anything to Google or read other Google data.</p>
        <p><b>If you are a realtor</b>, the listings you publish, the photos you upload and the enquiries you receive
          are stored with your account.</p>
      </section>

      <section>
        <h2>2. Why we use it</h2>
        <ul>
          <li>To pass your enquiry to the realtor who holds the listing — that is the purpose of the site.</li>
          <li>To run your account: sign-in, saved listings, saved searches, your dashboard.</li>
          <li>To show realtor and agency profiles publicly, so buyers know who they are dealing with.</li>
          <li>To keep the platform honest: rate limits, spam checks and a moderation log of admin actions.</li>
        </ul>
        <p>We do not sell personal data, do not run advertising, and do not send marketing email.</p>
      </section>

      <section>
        <h2>3. Who can see what</h2>
        <ul>
          <li><b>Realtors</b> see the enquiries sent to their listings (name, phone, email, message).
            Agency owners see enquiries sent to anyone in their agency.</li>
          <li><b>The public</b> sees realtor and agency profiles, listings and reviews. Buyer accounts are never public.</li>
          <li><b>Platform admins</b> can see accounts, listings and enquiries in order to moderate the site.
            Every admin action is logged.</li>
          <li><b>Service providers</b> that store or move the data for us: Supabase (database, sign-in, photo storage)
            and Vercel (hosting). Maps are drawn with OpenStreetMap tiles, which means your browser requests map
            images from OpenStreetMap servers. Google handles the sign-in if you choose it. WhatsApp handles the
            conversation if you choose it.</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>We use one kind of cookie: the sign-in session, so you stay logged in. There are no advertising or
          tracking cookies. Signing out removes the session cookie.</p>
      </section>

      <section>
        <h2>5. How long we keep it</h2>
        <ul>
          <li>Enquiries stay with the realtor they were sent to, so they can follow up; you can ask us to delete yours.</li>
          <li>Accounts stay until you ask to close them. Closing an account removes your profile and, for realtors,
            your listings and photos.</li>
          <li>Server logs and anti-abuse counters are kept for days, not months.</li>
        </ul>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>You can ask to see the data we hold about you, to correct it, or to have it deleted. Account details can
          be changed from your account page. For anything else, contact us (below) from the email address on the
          account so we can verify it is you. We answer within 30 days.</p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>Resoha is for adults buying, renting and selling property. We do not knowingly collect data from anyone
          under 18.</p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>If this policy changes in a way that matters, we update the date at the top and, for account holders,
          mention it on the site. Continued use after that means you accept the updated version.</p>
      </section>
    </LegalPage>
  );
}
