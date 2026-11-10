import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/LegalPage";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms & Conditions", description: "Terms and conditions for driving lessons, packages, gift vouchers and promo codes at Sagoon Driving School.", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Terms & Conditions" intro={`These terms apply when you book a lesson, buy a package or gift voucher, or use the website of ${s.businessName} (ABN ${s.abn}). By booking, you agree to them.`}>
      <h2>1. Bookings</h2>
      <ul>
        <li>Bookings can be made online, by phone or by message. A booking is confirmed once you receive a confirmation email or message from us.</li>
        <li>All lessons are one-on-one, in our automatic dual-control vehicle, and include pickup and drop-off within our service area.</li>
        <li>Lesson times include pickup and drop-off. If you are not at the pickup address at the start time, we will wait up to 15 minutes; the lesson still ends at the booked time.</li>
        <li>Changes and cancellations are covered by our <Link href="/cancellation-policy">Cancellation & Refund Policy</Link>.</li>
      </ul>

      <h2>2. Prices, GST and payment</h2>
      <ul>
        <li>All prices are in Australian dollars and include GST. A tax invoice is available for every booking and package.</li>
        <li>Single lessons are paid on the day of the lesson by card, cash or PayID, or by bank transfer before the lesson. {s.paymentInstructions}</li>
        <li>Packages are payable at or before your first package lesson. Package lessons can be booked once the package is requested; we may pause bookings if payment is overdue.</li>
        <li>We may change our prices at any time, but the price confirmed at the time of booking applies to that booking, and prepaid packages are honoured.</li>
      </ul>

      <h2>3. Your responsibilities as a learner</h2>
      <ul>
        <li>You must hold a valid NSW learner licence, a valid overseas or interstate licence that allows you to drive in NSW, or another licence appropriate for the lesson, and show it to your instructor at the start of every lesson.</li>
        <li>You must not drive under the influence of alcohol, drugs or any medication that may affect your driving. Learner and provisional drivers must have a zero blood alcohol concentration.</li>
        <li>You must be fit to drive and tell us about any medical condition, injury or eyesight requirement that may affect your driving (and wear glasses or contact lenses if your licence requires them).</li>
        <li>You must follow the reasonable instructions of your instructor and obey all road rules.</li>
      </ul>

      <h2>4. Safety and the instructor&apos;s right to end a lesson</h2>
      <p>Our vehicle is fitted with dual controls and our instructor may use them at any time for safety. Your instructor may refuse to start, or may end, a lesson early if you do not have a valid licence, appear affected by alcohol or drugs, appear unfit to drive, behave unsafely or abusively, or if conditions become unsafe. If the lesson cannot go ahead because of a reason within your control, the lesson fee may still be payable. If it is ended because of weather or another reason outside your control, we&apos;ll reschedule at no cost.</p>

      <h2>5. Driving tests</h2>
      <p>You are responsible for booking your driving test with Service NSW. If you book our Driving Test package, we provide the vehicle for the test as described. Whether you pass is decided by the Service NSW testing officer — we can&apos;t guarantee a result. If our vehicle cannot be used for your test because of a reason within our control, we&apos;ll refund the package and reasonable test rebooking fees.</p>

      <h2>6. Gift vouchers</h2>
      <ul>
        <li>Gift vouchers are valid for at least <strong>3 years</strong> from the date of purchase, as required by the Australian Consumer Law. The expiry date is shown on the voucher.</li>
        <li>Vouchers can be redeemed against any lesson or package by entering the code when booking. Unused balances remain available until expiry.</li>
        <li>Vouchers are not redeemable for cash except where required by law.</li>
      </ul>

      <h2>7. Promo, discount and referral codes</h2>
      <ul>
        <li>Promo codes are subject to the conditions stated with the code (for example, student or pensioner eligibility — we may ask to see a valid card).</li>
        <li>Only one code can be used per booking unless we say otherwise. Codes have no cash value and may be withdrawn or have usage limits.</li>
      </ul>

      <h2>8. Australian Consumer Law and liability</h2>
      <p>Our services come with guarantees that cannot be excluded under the Australian Consumer Law, including that they will be provided with due care and skill. Nothing in these terms excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law or any other law that cannot lawfully be excluded.</p>
      <p>To the extent permitted by law, and except for those non-excludable guarantees, our liability for any loss arising from our services is limited to re-supplying the lesson or refunding the price paid for it. We are not liable for indirect or consequential loss to the extent permitted by law. Our vehicle is comprehensively insured for use in driving lessons.</p>

      <h2>9. Website and accounts</h2>
      <ul>
        <li>You are responsible for keeping your login details secure and for activity on your account.</li>
        <li>Learner tips on this website are general information only and may not reflect the latest rules — always check with Transport for NSW and Service NSW.</li>
        <li>We handle your personal information in line with our <Link href="/privacy">Privacy Policy</Link>.</li>
      </ul>

      <h2>10. General</h2>
      <p>These terms are governed by the laws of New South Wales, Australia. We may update these terms from time to time; the version on this page at the time you book applies to that booking. Questions? Contact us on {s.phone} or {s.email}.</p>
    </LegalPage>
  );
}
