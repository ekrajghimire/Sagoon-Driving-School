import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, getSettings } from "@/lib/db";
import { fmtDate, fmtTime, durationLabel } from "@/lib/time";
import { InvoiceLayout } from "@/components/InvoiceLayout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tax invoice", robots: { index: false } };

/** Tax invoice for a single lesson booking (accessed by the private booking link). */
export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await prisma.booking.findUnique({ where: { manageToken: token }, include: { packagePurchase: { include: { package: true } } } });
  if (!b) notFound();
  const s = await getSettings();
  const total = b.priceCents - b.discountCents;
  return (
    <InvoiceLayout
      settings={s}
      number={b.ref}
      date={b.createdAt}
      billTo={[b.customerName, b.customerEmail, b.customerPhone]}
      lines={[
        { desc: `${b.title} — ${durationLabel(b.durationMins)}, automatic. ${fmtDate(b.startsAt)} ${fmtTime(b.startsAt)}`, amount: b.priceCents },
        ...(b.discountCents ? [{ desc: "Discount", amount: -b.discountCents }] : []),
      ]}
      total={b.paymentStatus === "CREDIT" ? 0 : total}
      note={b.paymentStatus === "CREDIT" ? `Paid by package credit (${b.packagePurchase?.package.name}, purchase ${b.packagePurchase?.ref}). See that purchase for its tax invoice.` : b.paymentStatus === "PAID" ? `Paid${b.paymentMethod ? ` by ${b.paymentMethod}` : ""}. Thank you.` : b.status === "CANCELLED" ? "Booking cancelled — nothing payable." : `Amount due at the lesson. ${s.paymentInstructions}`}
    />
  );
}
