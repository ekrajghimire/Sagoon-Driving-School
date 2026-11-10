import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, getSettings } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/session";
import { InvoiceLayout } from "@/components/InvoiceLayout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tax invoice", robots: { index: false } };

export default async function PurchaseInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/invoice/purchase/${id}`);
  const p = await prisma.packagePurchase.findUnique({ where: { id }, include: { package: true, user: true } });
  if (!p || (p.userId !== user.id && !(STAFF_ROLES as readonly string[]).includes(user.role))) notFound();
  const s = await getSettings();
  return (
    <InvoiceLayout
      settings={s}
      number={p.ref}
      date={p.paidAt ?? p.createdAt}
      billTo={[p.user.name, p.user.email, p.user.phone ?? ""].filter(Boolean)}
      lines={[{ desc: `${p.package.name} — ${p.creditsTotal} lessons (automatic)`, amount: p.priceCents }, ...(p.discountCents ? [{ desc: "Discount", amount: -p.discountCents }] : [])]}
      total={p.priceCents - p.discountCents}
      note={p.status === "PAID" ? `Paid${p.paymentMethod ? ` by ${p.paymentMethod}` : ""}. Thank you.` : p.status === "PENDING_PAYMENT" ? `Payment due. ${s.paymentInstructions} Reference: ${p.ref}.` : `Status: ${p.status.toLowerCase()}.`}
    />
  );
}
