import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/LegalPage";
import { getSettings } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy", description: "How Sagoon Driving School collects, uses and protects your personal information under the Australian Privacy Act 1988.", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Privacy Policy" intro={`${s.businessName} (ABN ${s.abn}) ("we", "us") respects your privacy. This policy explains how we handle personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).`}>
      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Contact details:</strong> your name, email address, mobile number.</li>
        <li><strong>Booking details:</strong> lesson dates and times, pickup addresses, notes you give us, payment status and invoices.</li>
        <li><strong>Learner details (optional):</strong> licence number, licence type, driving test date, and lesson progress notes and skill ratings recorded by your instructor.</li>
        <li><strong>Account details:</strong> login email, an encrypted (hashed) password, or your Google account name and email if you sign in with Google.</li>
        <li><strong>Technical information:</strong> IP address, browser type and pages visited — used for security, rate limiting and (only with your consent) analytics.</li>
      </ul>
      <p>We do <strong>not</strong> collect or store credit card numbers on this website. If you pay by card, it is processed in person by our payment terminal provider.</p>

      <h2>2. Why we collect it</h2>
      <ul>
        <li>To take, confirm, remind you about, reschedule and deliver your lessons, including picking you up.</li>
        <li>To issue tax invoices and keep business records required by law (for example, tax records for 5 years).</li>
        <li>To track your progress and tailor lessons to you.</li>
        <li>To respond to enquiries and, if you opt in, send occasional learner tips by email.</li>
        <li>To keep the website secure and prevent misuse.</li>
      </ul>
      <p>You can deal with us anonymously or using a pseudonym for general enquiries, but we need your real name and contact details to book a lesson.</p>

      <h2>3. Who we share it with</h2>
      <p>We never sell your personal information. We share it only with service providers who help us run the business, and only as needed:</p>
      <ul>
        <li><strong>Google (Google Calendar / Google Workspace):</strong> lesson bookings, including your name, phone number and pickup address, are saved to our private Google Calendar so your instructor can see their schedule.</li>
        <li><strong>Email provider:</strong> to send booking confirmations, reminders and receipts.</li>
        <li><strong>Website hosting and database providers:</strong> to store the website and booking data securely.</li>
        <li><strong>Analytics providers (only with your consent):</strong> Google Analytics and Meta (Facebook) Pixel, if enabled.</li>
        <li>Government authorities where required by law.</li>
      </ul>

      <h2>4. Overseas disclosure</h2>
      <p>Some of our service providers (including Google and our hosting and database providers) may store or process data on servers outside Australia, including in the United States and other countries. We choose reputable providers with strong security practices, and take reasonable steps to ensure they handle your information consistently with the APPs.</p>

      <h2>5. Security and retention</h2>
      <p>Your data is transmitted over encrypted HTTPS connections. Passwords are stored as one-way hashes. Access to booking data is limited to our staff and instructor. We keep booking and invoice records for as long as required by law (generally 5 years for tax records), and delete or de-identify information we no longer need.</p>

      <h2>6. Access, correction and deleting your account</h2>
      <p>You can view and update most of your details in <Link href="/account">your account</Link>. You can also delete your account from your account settings — this removes your login and profile. We may need to keep some booking and invoice records to meet legal and tax obligations; these will be retained only for that purpose.</p>
      <p>To request access to, or correction of, any personal information we hold, contact us using the details below. We will respond within 30 days.</p>

      <h2 id="cookies">7. Cookies</h2>
      <p>Cookies are small files stored by your browser.</p>
      <ul>
        <li><strong>Essential cookies</strong> keep you logged in, protect forms against misuse and remember your cookie choice. The site can&apos;t work properly without them, so they are always on.</li>
        <li><strong>Analytics and marketing cookies</strong> (Google Analytics, Meta Pixel) help us understand how visitors use the site and measure advertising. These are <strong>only</strong> loaded if you click &ldquo;Accept all&rdquo; on our cookie notice.</li>
      </ul>
      <p>You can change your mind at any time by clearing this site&apos;s data in your browser settings — the cookie notice will appear again.</p>

      <h2>8. Marketing emails</h2>
      <p>We only send learner tips and offers if you opt in. Every email includes a way to unsubscribe, or you can contact us to be removed.</p>

      <h2>9. Complaints</h2>
      <p>If you have a privacy concern, please contact us first and we&apos;ll try to resolve it within 30 days. If you&apos;re not satisfied, you can complain to the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a> or on 1300 363 992.</p>

      <h2>10. Contact us</h2>
      <p>{s.businessName}<br />{s.address}<br />Phone: <a href={`tel:${SITE.phoneTel}`}>{s.phone}</a><br />Email: <a href={`mailto:${s.email}`}>{s.email}</a></p>
    </LegalPage>
  );
}
