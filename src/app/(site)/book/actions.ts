"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createBookingGroup, BookingError } from "@/lib/booking-service";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { isIsoDate } from "@/lib/time";
import { prisma } from "@/lib/db";

const schema = z
  .object({
    date: z.string().refine(isIsoDate, "Invalid date"),
    startMin: z.number().int().min(0).max(1439),
    // Split lessons: one pick per hour (e.g. a 2-hour lesson as two 1-hour sessions).
    slots: z
      .array(z.object({ date: z.string().refine(isIsoDate, "Invalid date"), startMin: z.number().int().min(0).max(1439) }))
      .min(1)
      .max(6)
      .optional(),
    lessonTypeId: z.string().nullable().optional(),
    usePackageCredit: z.boolean().optional(),
    customerName: z.string().trim().min(2, "Please enter your full name").max(100),
    customerEmail: z.email("Please enter a valid email"),
    customerPhone: z.string().trim().regex(/^[0-9 +()-]{8,20}$/, "Please enter a valid phone number"),
    pickupAddress: z.string().trim().min(4, "Please enter a pickup address").max(200),
    pickupSuburb: z.string().trim().min(2, "Please choose your suburb").max(60),
    customerNotes: z.string().max(1000).optional().nullable(),
    promoCode: z.string().max(40).optional().nullable(),
    consent: z.literal(true, { error: "Please accept the terms and privacy policy" }),
    saveAddress: z.boolean().optional(),
  })
  .refine((d) => d.lessonTypeId || d.usePackageCredit, { message: "Please choose a lesson type" });

export type BookingResult = { error?: string; code?: string };

export async function createBookingAction(payload: unknown): Promise<BookingResult> {
  if (!(await rateLimit("booking", 8, 600))) return { error: "Too many booking attempts. Please wait a few minutes or call us." };
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const user = await getCurrentUser();
  const d = parsed.data;

  let token: string;
  try {
    const bookings = await createBookingGroup({ ...d, userId: user?.id ?? null });
    token = bookings[0].manageToken;
    if (user && d.saveAddress) {
      const exists = await prisma.savedAddress.findFirst({ where: { userId: user.id, address: d.pickupAddress } });
      if (!exists) await prisma.savedAddress.create({ data: { userId: user.id, label: "Pickup", address: d.pickupAddress, suburb: d.pickupSuburb } });
    }
    if (user && !user.phone) await prisma.user.update({ where: { id: user.id }, data: { phone: d.customerPhone } });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, code: e.code };
    console.error("[booking] unexpected", e);
    return { error: "Something went wrong saving your booking. Please try again or call us." };
  }
  redirect(`/booking/${token}?new=1`);
}

export async function checkPromo(code: string): Promise<{ ok: boolean; message: string; kind?: "PERCENT" | "FIXED"; value?: number }> {
  if (!(await rateLimit("promo", 20, 600))) return { ok: false, message: "Too many attempts." };
  const { validatePromo } = await import("@/lib/booking-service");
  try {
    const p = await validatePromo(code);
    return { ok: true, message: p.description || "Code applied", kind: p.kind, value: p.value };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Invalid code" };
  }
}
