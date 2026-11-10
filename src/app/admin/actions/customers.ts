"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { attempt, str, bool, UserError } from "../_lib/action-utils";
import { ADMINS, OWNER_ONLY } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

export async function updateLearner(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({
        id: z.string().min(1),
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().max(30),
        licenceNumber: z.string().trim().max(40),
        licenceType: z.string().trim().max(60),
        testDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      })
      .parse({ id: str(fd, "id"), name: str(fd, "name"), phone: str(fd, "phone"), licenceNumber: str(fd, "licenceNumber"), licenceType: str(fd, "licenceType"), testDate: str(fd, "testDate") });
    await prisma.user.update({
      where: { id: d.id },
      data: {
        name: d.name,
        phone: d.phone || null,
        licenceNumber: d.licenceNumber || null,
        licenceType: d.licenceType || null,
        testDate: d.testDate ? new Date(`${d.testDate}T00:00:00+10:00`) : null,
        marketingOptIn: bool(fd, "marketingOptIn"),
      },
    });
    revalidatePath(`/admin/customers/${d.id}`);
    return "Customer updated";
  });
}

export async function updatePurchase(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({ id: z.string().min(1), status: z.enum(["PAID", "CANCELLED", "REFUNDED", "PENDING_PAYMENT"]), paymentMethod: z.string().max(40).optional() })
      .parse({ id: str(fd, "id"), status: str(fd, "status"), paymentMethod: str(fd, "paymentMethod") || undefined });
    const p = await prisma.packagePurchase.findUnique({ where: { id: d.id } });
    if (!p) throw new UserError("Purchase not found.");
    await prisma.packagePurchase.update({
      where: { id: p.id },
      data: {
        status: d.status,
        paymentMethod: d.status === "PAID" ? d.paymentMethod ?? "Card" : p.paymentMethod,
        paidAt: d.status === "PAID" ? p.paidAt ?? new Date() : d.status === "PENDING_PAYMENT" ? null : p.paidAt,
      },
    });
    revalidatePath(`/admin/customers/${p.userId}`);
    revalidatePath("/admin");
    return d.status === "PAID"
      ? "Package marked as paid"
      : d.status === "PENDING_PAYMENT"
        ? "Back to payment due"
        : `Package ${d.status.toLowerCase()} — ${p.creditsTotal - p.creditsUsed} unused credit(s) removed`;
  });
}

export async function changeRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireStaff(OWNER_ONLY);
  return attempt(async () => {
    const d = z.object({ id: z.string().min(1), role: z.enum(["CUSTOMER", "STAFF", "INSTRUCTOR", "OWNER"]) }).parse({ id: str(fd, "id"), role: str(fd, "role") });
    if (d.id === me.id && d.role !== "OWNER") throw new UserError("You can't remove your own owner access.");
    await prisma.user.update({ where: { id: d.id }, data: { role: d.role } });
    revalidatePath(`/admin/customers/${d.id}`);
    revalidatePath("/admin/users");
    return `Role changed to ${d.role.toLowerCase()}`;
  });
}

export async function promoteByEmail(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(OWNER_ONLY);
  return attempt(async () => {
    const d = z.object({ email: z.email(), role: z.enum(["STAFF", "INSTRUCTOR", "OWNER"]) }).parse({ email: str(fd, "email").toLowerCase(), role: str(fd, "role") });
    const u = await prisma.user.findUnique({ where: { email: d.email } });
    if (!u) throw new UserError("No account with that email. Ask them to sign up on the website first, then promote them here.");
    await prisma.user.update({ where: { id: u.id }, data: { role: d.role } });
    revalidatePath("/admin/users");
    return `${u.name} is now ${d.role.toLowerCase()}`;
  });
}
