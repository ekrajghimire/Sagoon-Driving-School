"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { cancelBooking, rescheduleBooking, syncToCalendar, createBooking, creditBalance } from "@/lib/booking-service";
import { SKILLS } from "@/lib/skills";
import { isIsoDate } from "@/lib/time";
import { attempt, str, UserError, hhmmToMinutes, dollarsToCents } from "../_lib/action-utils";
import { ALL_STAFF, ADMINS } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

const id = z.string().min(1).max(64);

function touch(bookingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function setBookingStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const data = z.object({ id, status: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW"]) }).parse({ id: str(fd, "id"), status: str(fd, "status") });
    const b = await prisma.booking.findUnique({ where: { id: data.id } });
    if (!b) throw new UserError("Booking not found.");
    if (b.status === "CANCELLED") throw new UserError("Cancelled bookings can't be changed — create a new booking instead.");
    await prisma.booking.update({ where: { id: b.id }, data: { status: data.status } });
    touch(b.id);
    return data.status === "COMPLETED" ? "Marked as completed" : data.status === "NO_SHOW" ? "Marked as no-show" : "Back to confirmed";
  });
}

export async function setPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const data = z
      .object({ id, paymentStatus: z.enum(["PAID", "UNPAID", "REFUNDED"]), paymentMethod: z.string().max(40).optional() })
      .parse({ id: str(fd, "id"), paymentStatus: str(fd, "paymentStatus"), paymentMethod: str(fd, "paymentMethod") || undefined });
    const b = await prisma.booking.findUnique({ where: { id: data.id } });
    if (!b) throw new UserError("Booking not found.");
    if (b.paymentStatus === "CREDIT") throw new UserError("This lesson was paid with a package credit — record payment on the package purchase.");
    await prisma.booking.update({
      where: { id: b.id },
      data: {
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentStatus === "PAID" ? data.paymentMethod ?? "Cash" : b.paymentMethod,
        paidAt: data.paymentStatus === "PAID" ? new Date() : data.paymentStatus === "UNPAID" ? null : b.paidAt,
      },
    });
    touch(b.id);
    return data.paymentStatus === "PAID" ? "Payment recorded" : data.paymentStatus === "REFUNDED" ? "Marked as refunded" : "Marked unpaid";
  });
}

export async function cancelAsStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const data = z.object({ id, reason: z.string().max(300).optional() }).parse({ id: str(fd, "id"), reason: str(fd, "reason") || undefined });
    await cancelBooking(data.id, { byStaff: true, reason: data.reason ?? "Cancelled by Sagoon Driving School" });
    touch(data.id);
    return "Booking cancelled and customer notified";
  });
}

export async function rescheduleAsStaff(bookingId: string, date: string, startMin: number): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const data = z.object({ id, date: z.string().refine(isIsoDate), startMin: z.number().int().min(0).max(1439) }).parse({ id: bookingId, date, startMin });
    await rescheduleBooking(data.id, data.date, data.startMin, { byStaff: true });
    touch(data.id);
    return "Rescheduled — customer emailed and calendar updated";
  });
}

export async function saveNotes(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const data = z.object({ id, notes: z.string().max(5000) }).parse({ id: str(fd, "id"), notes: str(fd, "notes") });
    await prisma.booking.update({ where: { id: data.id }, data: { instructorNotes: data.notes || null } });
    touch(data.id);
    return "Notes saved";
  });
}

export async function saveRatings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const bookingId = id.parse(str(fd, "id"));
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new UserError("Booking not found.");
    await prisma.$transaction(
      SKILLS.map((s) => {
        const raw = str(fd, `rating_${s.key}`);
        if (!raw) return prisma.skillRating.deleteMany({ where: { bookingId, skill: s.key } });
        const rating = z.coerce.number().int().min(1).max(5).parse(raw);
        return prisma.skillRating.upsert({
          where: { bookingId_skill: { bookingId, skill: s.key } },
          update: { rating, userId: b.userId },
          create: { bookingId, skill: s.key, rating, userId: b.userId },
        });
      }),
    );
    touch(bookingId);
    if (b.userId) revalidatePath(`/admin/customers/${b.userId}`);
    return "Progress saved";
  });
}

export async function retrySync(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const bookingId = id.parse(str(fd, "id"));
    await syncToCalendar(bookingId);
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { calendarSync: true, calendarError: true } });
    touch(bookingId);
    if (b?.calendarSync === "FAILED") throw new UserError(`Still failing: ${b.calendarError ?? "unknown error"}`);
    return "Calendar synced";
  });
}

export async function retryAllFailedSyncs(_: ActionState, fd: FormData): Promise<ActionState> {
  void fd;
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const failed = await prisma.booking.findMany({ where: { calendarSync: { in: ["FAILED", "PENDING"] } }, select: { id: true }, take: 50 });
    for (const b of failed) await syncToCalendar(b.id);
    const still = await prisma.booking.count({ where: { calendarSync: "FAILED" } });
    touch();
    return still ? `Retried ${failed.length}; ${still} still failing — check Google Calendar settings.` : `Synced ${failed.length} booking(s)`;
  });
}

/* ───────── Manual booking (phone customers) ───────── */

export type CustomerHit = { id: string; name: string; email: string; phone: string; credits: number };

export async function searchCustomers(q: string): Promise<CustomerHit[]> {
  await requireStaff(ADMINS);
  const term = String(q ?? "").trim().slice(0, 80);
  if (term.length < 2) return [];
  const users = await prisma.user.findMany({
    where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }] },
    take: 8,
    orderBy: { name: "asc" },
  });
  return Promise.all(
    users.map(async (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? "", credits: (await creditBalance(u.id)).remaining })),
  );
}

const manualSchema = z
  .object({
    mode: z.enum(["lesson", "custom", "credit"]),
    lessonTypeId: z.string().optional(),
    customTitle: z.string().max(100).optional(),
    customDuration: z.number().int().min(30).max(240).optional(),
    customPrice: z.string().optional(),
    timing: z.enum(["slot", "override"]),
    date: z.string().refine(isIsoDate, "Choose a date"),
    startMin: z.number().int().min(0).max(1439).optional(),
    time: z.string().optional(),
    userId: z.string().optional().nullable(),
    customerName: z.string().trim().min(2, "Customer name is required").max(100),
    customerEmail: z.union([z.email("Invalid email"), z.literal("")]),
    customerPhone: z.string().trim().min(8, "Phone is required").max(30),
    pickupAddress: z.string().trim().min(3, "Pickup address is required").max(200),
    pickupSuburb: z.string().trim().min(2, "Pickup suburb is required").max(60),
    customerNotes: z.string().max(1000).optional(),
    promoCode: z.string().max(40).optional(),
  })
  .refine((d) => d.mode !== "lesson" || d.lessonTypeId, { message: "Choose a lesson type" })
  .refine((d) => d.mode !== "custom" || (d.customDuration && d.customTitle), { message: "Enter a title and duration for the custom lesson" })
  .refine((d) => d.mode !== "credit" || d.userId, { message: "Select a registered customer to use their package credit" });

export async function createManualBooking(payload: unknown): Promise<ActionState> {
  await requireStaff(ADMINS);
  let bookingId: string | null = null;
  const res = await attempt(async () => {
    const d = manualSchema.parse(payload);
    const startMin = d.timing === "slot" ? d.startMin : d.time ? hhmmToMinutes(d.time) : undefined;
    if (startMin == null) throw new UserError("Choose a start time.");
    const booking = await createBooking({
      date: d.date,
      startMin,
      lessonTypeId: d.mode === "lesson" ? d.lessonTypeId : null,
      usePackageCredit: d.mode === "credit",
      userId: d.userId || null,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      pickupAddress: d.pickupAddress,
      pickupSuburb: d.pickupSuburb,
      customerNotes: d.customerNotes || null,
      promoCode: d.promoCode || null,
      createdByStaff: true,
      staffOverride: d.timing === "override",
      ...(d.mode === "custom"
        ? { staffDurationMins: d.customDuration, staffTitle: d.customTitle, staffPriceCents: d.customPrice ? dollarsToCents(d.customPrice) : 0 }
        : {}),
    });
    bookingId = booking.id;
    touch();
  });
  if (res.ok && bookingId) redirect(`/admin/bookings/${bookingId}?created=1`);
  return res;
}
