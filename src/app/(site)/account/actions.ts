"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { sendEmail, emails } from "@/lib/email";
import { validatePromo, BookingError } from "@/lib/booking-service";
import { applyPromo, aud } from "@/lib/money";
import { shortRef } from "@/lib/ids";
import { SITE } from "@/lib/site";
import type { FormState } from "@/app/actions/public";

export async function buyPackage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account/packages");
  const slug = String(fd.get("slug") ?? "");
  const code = String(fd.get("promo") ?? "").trim();
  const pkg = await prisma.package.findFirst({ where: { slug, active: true } });
  if (!pkg) return { error: "That package isn't available." };
  // Credits can be used before payment, so allow only one unpaid package at a time.
  const unpaid = await prisma.packagePurchase.count({ where: { userId: user.id, status: "PENDING_PAYMENT" } });
  if (unpaid > 0) return { error: "You already have a package awaiting payment. Please pay for it at your next lesson (or call us) before ordering another." };
  let promo = null;
  if (code) {
    try {
      promo = await validatePromo(code);
    } catch (e) {
      return { error: e instanceof BookingError ? e.message : "Invalid code" };
    }
  }
  const discount = applyPromo(pkg.priceCents, promo);
  const purchase = await prisma.$transaction(async (tx) => {
    if (promo) {
      const ok = await tx.promoCode.updateMany({ where: { id: promo.id, OR: [{ maxUses: null }, { uses: { lt: promo.maxUses ?? 0 } }] }, data: { uses: { increment: 1 } } });
      if (ok.count !== 1) throw new Error("PROMO_USED");
    }
    return tx.packagePurchase.create({
      data: { ref: shortRef("PKG"), userId: user.id, packageId: pkg.id, priceCents: pkg.priceCents, discountCents: discount, creditsTotal: pkg.lessonCount, promoCodeId: promo?.id ?? null },
    });
  }).catch((e) => (String(e).includes("PROMO_USED") ? null : Promise.reject(e)));
  if (!purchase) return { error: "That promo code has been fully used." };

  const total = aud(pkg.priceCents - discount);
  await sendEmail(
    emails.generic(user.email, `Your ${pkg.name} is ready — ${SITE.name}`, `Thanks, ${user.name.split(" ")[0]}!`, [
      `Your ${pkg.name} (${pkg.lessonCount} lessons) has been added to your account. You can start booking lessons with your credits straight away.`,
      `Total ${total} incl. GST — pay at your first lesson (card, cash or PayID) or by bank transfer using reference ${purchase.ref}.`,
    ], { href: `${SITE.url}/book`, label: "Book your first lesson" }),
  );
  if (process.env.OWNER_EMAIL) {
    await sendEmail(emails.generic(process.env.OWNER_EMAIL, `Package order: ${user.name} — ${pkg.name}`, "New package order", [`${user.name} <${user.email}> ordered ${pkg.name} (${total}). Ref ${purchase.ref}. Mark it paid in Admin → Customers once payment is received.`]));
  }
  revalidatePath("/account");
  redirect("/account/packages?ordered=1");
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  licenceNumber: z.string().trim().max(30).optional(),
  licenceType: z.string().trim().max(60).optional(),
  testDate: z.string().optional(),
  marketingOptIn: z.string().optional(),
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Please check your details." };
  const d = p.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: d.name,
      phone: d.phone || null,
      licenceNumber: d.licenceNumber || null,
      licenceType: d.licenceType || null,
      testDate: d.testDate && /^\d{4}-\d{2}-\d{2}$/.test(d.testDate) ? new Date(`${d.testDate}T00:00:00Z`) : null,
      marketingOptIn: d.marketingOptIn === "on",
    },
  });
  revalidatePath("/account/profile");
  return { ok: true, message: "Saved." };
}

export async function addAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = z.object({ label: z.string().trim().min(1).max(40), address: z.string().trim().min(4).max(200), suburb: z.string().trim().min(2).max(60) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Please enter a label, address and suburb." };
  if ((await prisma.savedAddress.count({ where: { userId: user.id } })) >= 10) return { error: "You can save up to 10 addresses." };
  await prisma.savedAddress.create({ data: { ...p.data, userId: user.id } });
  revalidatePath("/account/profile");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(fd: FormData) {
  const user = await requireUser();
  await prisma.savedAddress.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/account/profile");
}

/** Australian Privacy Act: let customers delete their account. Booking records are kept (de-linked) for tax purposes. */
export async function deleteAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (fd.get("confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  if (user.role !== "CUSTOMER") return { error: "Staff accounts must be removed by the owner." };
  const upcoming = await prisma.booking.count({ where: { userId: user.id, status: "CONFIRMED", startsAt: { gt: new Date() } } });
  if (upcoming) return { error: `Please cancel your ${upcoming} upcoming lesson(s) first, or contact us.` };
  await prisma.$transaction([
    prisma.booking.updateMany({ where: { userId: user.id }, data: { userId: null, customerNotes: null } }),
    prisma.waitlistEntry.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {}
  redirect("/?account-deleted=1");
}
