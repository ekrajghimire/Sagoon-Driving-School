import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/LegalPage";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cancellation & Refund Policy", description: "Free cancellation and rescheduling up to 24 hours before your driving lesson. Late cancellation, weather and package refund rules.", alternates: { canonical: "/cancellation-policy" } };

export default async function CancellationPage() {
  const s = await getSettings();
  const h = s.cancellationWindowHours;
  return (
    <LegalPage title="Cancellation & Refund Policy" intro="We understand plans change. Here's how cancelling and rescheduling works — in plain English.">
      <h2>Free changes with {h} hours&apos; notice</h2>
      <p>You can cancel or reschedule any lesson <strong>free of charge</strong> up to {h} hours before the start time. Use the &ldquo;Manage booking&rdquo; link in your confirmation email, or log in to <Link href="/account">your account</Link>. If you used a package credit, it goes straight back into your account.</p>

      <h2>Late cancellations (less than {h} hours)</h2>
      <p>Online changes close {h} hours before the lesson. Please call or text us on {s.phone} as soon as you can. Because we usually can&apos;t fill a late-cancelled slot, a <strong>late cancellation fee of up to the full lesson price</strong> may apply (or one package credit may be used). We&apos;re reasonable — if you&apos;re unwell or have a genuine emergency, talk to us and we&apos;ll do our best to waive or reduce the fee.</p>

      <h2>No-shows</h2>
      <p>If you&apos;re not at the pickup address within 15 minutes of the start time and we can&apos;t reach you, or you can&apos;t take the lesson because you don&apos;t have your licence with you or are unfit to drive, the lesson is treated as a no-show and the full lesson fee (or one package credit) applies.</p>

      <h2>Weather and safety</h2>
      <p>Lessons go ahead in light rain — it&apos;s valuable practice. If conditions are unsafe (for example, severe storms, flooding, hail or bushfire smoke warnings), we&apos;ll contact you to reschedule at <strong>no cost</strong>.</p>

      <h2>If we need to cancel</h2>
      <p>If we have to cancel or can&apos;t attend (for example, due to illness or a vehicle problem), we&apos;ll let you know as early as possible and you can choose a free reschedule, a lesson credit, or a <strong>full refund</strong> of anything you&apos;ve prepaid for that lesson.</p>

      <h2>Driving Test package</h2>
      <p>If Service NSW cancels or reschedules your test, contact us and we&apos;ll move your Driving Test package to the new date at no cost (subject to availability). If you cancel your test package with less than {h} hours&apos; notice, the late cancellation terms above apply.</p>

      <h2>Package refunds</h2>
      <p>You can request a refund of an unused or partly used package at any time. We&apos;ll refund the amount paid <strong>minus the lessons already used, charged at our standard single-lesson price</strong> at the time of purchase (so the refund is never more than what you paid). Package credits don&apos;t expire.</p>

      <h2>Gift vouchers</h2>
      <p>Gift vouchers are valid for at least 3 years from purchase. They are generally not refundable for cash, except where required by law.</p>

      <h2>Your consumer rights</h2>
      <p>Nothing in this policy limits your rights under the Australian Consumer Law. If a lesson is not provided with due care and skill, you may be entitled to a remedy such as a free lesson or a refund.</p>

      <h2>How refunds are paid</h2>
      <p>Refunds are paid by the method you used to pay where possible (for example, back to your card, or by bank transfer), usually within 5 business days of approval.</p>
    </LegalPage>
  );
}
