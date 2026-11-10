import "server-only";
import { prisma, getSettings, getInstructor } from "./db";
import { Prisma } from "@/generated/prisma/client";
import { generateSlots, workingHoursFor, type BusyInterval, type Slot } from "./availability";
import { sydneyDayRange, sydneyToUtc, todaySydney, addDays, fmtDate } from "./time";
import { calendarConfigured, getGoogleBusy, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "./google-calendar";
import { sendEmail, emails } from "./email";
import { applyPromo } from "./money";
import { shortRef, secretToken } from "./ids";

/** Every booking write is serialised with this Postgres advisory lock (one instructor, one car). */
const BOOKING_LOCK_KEY = 72_466_001;

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "SLOT_TAKEN" | "INVALID" | "CALENDAR_UNAVAILABLE" | "NOT_ALLOWED" | "NO_CREDITS" | "PROMO" = "INVALID",
  ) {
    super(message);
  }
}

type Db = Prisma.TransactionClient | typeof prisma;

async function loadDayContext(db: Db, date: string, excludeBookingId?: string) {
  // Everything is read through `db` so that, inside a booking transaction, no second connection is needed.
  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? (await getSettings());
  const instructor = await db.instructor.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!instructor) throw new BookingError("No instructor is available right now. Please call us.");
  const { start, end } = sydneyDayRange(date);
  // Widen the window by the buffer so a lesson ending at 9:00 still pushes a 9:05 start.
  const pad = settings.travelBufferMins * 60_000;
  const winStart = new Date(start.getTime() - pad);
  const winEnd = new Date(end.getTime() + pad);

  const [hours, holiday, bookings, blocked] = await Promise.all([
    db.workingHours.findMany({ where: { instructorId: instructor.id } }),
    db.publicHoliday.findUnique({ where: { date } }),
    db.booking.findMany({
      where: {
        instructorId: instructor.id,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        startsAt: { lt: winEnd },
        endsAt: { gt: winStart },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    db.blockedTime.findMany({ where: { startsAt: { lt: winEnd }, endsAt: { gt: winStart } } }),
  ]);

  const busy: BusyInterval[] = [
    ...bookings.map((b) => ({ start: b.startsAt, end: b.endsAt, source: "booking" as const })),
    ...blocked.map((b) => ({ start: b.startsAt, end: b.endsAt, source: "blocked" as const })),
  ];
  return { settings, instructor, hours: workingHoursFor(date, hours), isHoliday: Boolean(holiday), busy, winStart, winEnd };
}

/**
 * Available start times for a Sydney date.
 * `strictCalendar` = throw if Google Calendar can't be reached (used when actually booking).
 */
export async function getAvailability(
  date: string,
  durationMins: number,
  opts: { excludeBookingId?: string; strictCalendar?: boolean; db?: Db; googleBusy?: BusyInterval[] } = {},
): Promise<{ slots: Slot[]; calendarOk: boolean }> {
  const db = opts.db ?? prisma;
  const ctx = await loadDayContext(db, date, opts.excludeBookingId);
  let google = opts.googleBusy ?? [];
  let calendarOk = true;
  if (!opts.googleBusy && calendarConfigured()) {
    try {
      google = await getGoogleBusy(ctx.winStart, ctx.winEnd);
    } catch (e) {
      calendarOk = false;
      console.error("[availability] Google Calendar read failed", e);
      if (opts.strictCalendar) {
        throw new BookingError("We couldn't check the calendar just now. Please try again in a minute or call us.", "CALENDAR_UNAVAILABLE");
      }
    }
  }
  const slots = generateSlots({
    date,
    durationMins,
    workingHours: ctx.hours,
    isHoliday: ctx.isHoliday,
    busy: [...ctx.busy, ...google],
    bufferMins: ctx.settings.travelBufferMins,
    slotIntervalMins: ctx.settings.slotIntervalMins,
    minNoticeHours: ctx.settings.minNoticeHours,
    maxAdvanceDays: ctx.settings.maxAdvanceDays,
    now: new Date(),
  });
  return { slots, calendarOk };
}

/** Which of the next N days have at least one slot (for the calendar picker). */
export async function getMonthOverview(fromDate: string, days: number, durationMins: number, excludeBookingId?: string) {
  const settings = await getSettings();
  const instructor = await getInstructor();
  const last = addDays(fromDate, days);
  const range = { start: sydneyDayRange(fromDate).start, end: sydneyDayRange(last).end };
  const pad = settings.travelBufferMins * 60_000;
  const [hours, holidays, bookings, blocked] = await Promise.all([
    prisma.workingHours.findMany({ where: { instructorId: instructor.id } }),
    prisma.publicHoliday.findMany({ where: { date: { gte: fromDate, lte: last } } }),
    prisma.booking.findMany({
      where: {
        instructorId: instructor.id,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        startsAt: { lt: range.end },
        endsAt: { gt: range.start },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.blockedTime.findMany({ where: { startsAt: { lt: range.end }, endsAt: { gt: range.start } } }),
  ]);
  let google: BusyInterval[] = [];
  if (calendarConfigured()) {
    try {
      google = await getGoogleBusy(new Date(range.start.getTime() - pad), new Date(range.end.getTime() + pad));
    } catch (e) {
      console.error("[overview] Google Calendar read failed", e);
    }
  }
  const busy: BusyInterval[] = [
    ...bookings.map((b) => ({ start: b.startsAt, end: b.endsAt, source: "booking" as const })),
    ...blocked.map((b) => ({ start: b.startsAt, end: b.endsAt, source: "blocked" as const })),
    ...google,
  ];
  const holidaySet = new Set(holidays.map((h) => h.date));
  const now = new Date();
  const result: Record<string, number> = {};
  for (let i = 0; i <= days; i++) {
    const date = addDays(fromDate, i);
    result[date] = generateSlots({
      date,
      durationMins,
      workingHours: workingHoursFor(date, hours),
      isHoliday: holidaySet.has(date),
      busy,
      bufferMins: settings.travelBufferMins,
      slotIntervalMins: settings.slotIntervalMins,
      minNoticeHours: settings.minNoticeHours,
      maxAdvanceDays: settings.maxAdvanceDays,
      now,
    }).length;
  }
  return result;
}

export type CreateBookingInput = {
  date: string;
  startMin: number;
  lessonTypeId?: string | null; // a single lesson / test package / refresher
  usePackageCredit?: boolean; // redeem a package credit instead
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupAddress: string;
  pickupSuburb: string;
  customerNotes?: string | null;
  promoCode?: string | null;
  createdByStaff?: boolean;
  /** Staff-only: skip working-hours / notice rules (still never overlaps another booking). */
  staffOverride?: boolean;
  staffDurationMins?: number;
  staffTitle?: string;
  staffPriceCents?: number;
};

function isOverlapViolation(e: unknown) {
  const s = String((e as { message?: string })?.message ?? e);
  return s.includes("Booking_no_overlap") || s.includes("23P01") || s.includes("exclusion constraint");
}

export async function createBooking(input: CreateBookingInput) {
  const settings = await getSettings();
  const instructor = await getInstructor();

  // 1. Work out what is being booked, its length and its price.
  let title: string;
  let durationMins: number;
  let priceCents: number;
  let lessonTypeId: string | null = null;
  let creditPurchaseId: string | null = null;

  if (input.usePackageCredit) {
    if (!input.userId) throw new BookingError("Please log in to use your package credits.", "NOT_ALLOWED");
    const purchase = await prisma.packagePurchase.findFirst({
      where: { userId: input.userId, status: { in: ["PAID", "PENDING_PAYMENT"] }, creditsUsed: { lt: prisma.packagePurchase.fields.creditsTotal } },
      include: { package: true },
      orderBy: { createdAt: "asc" },
    });
    if (!purchase) throw new BookingError("You don't have any package lessons left.", "NO_CREDITS");
    creditPurchaseId = purchase.id;
    title = `${purchase.package.name} lesson`;
    durationMins = purchase.package.lessonDurationMins;
    priceCents = 0;
  } else if (input.lessonTypeId) {
    const lt = await prisma.lessonType.findFirst({ where: { id: input.lessonTypeId, active: true } });
    if (!lt) throw new BookingError("That lesson type is no longer available.");
    lessonTypeId = lt.id;
    title = lt.name;
    durationMins = lt.durationMins;
    priceCents = lt.priceCents;
  } else if (input.createdByStaff && input.staffDurationMins) {
    title = input.staffTitle || "Driving lesson";
    durationMins = input.staffDurationMins;
    priceCents = input.staffPriceCents ?? 0;
  } else {
    throw new BookingError("Please choose a lesson type.");
  }
  if (input.createdByStaff && input.staffDurationMins) durationMins = input.staffDurationMins;
  if (input.createdByStaff && input.staffPriceCents != null && !creditPurchaseId) priceCents = input.staffPriceCents;

  const startsAt = sydneyToUtc(input.date, input.startMin);
  const endsAt = new Date(startsAt.getTime() + durationMins * 60_000);

  // 2. Promo / gift voucher.
  let promo: Awaited<ReturnType<typeof prisma.promoCode.findUnique>> = null;
  if (input.promoCode?.trim() && priceCents > 0) {
    promo = await validatePromo(input.promoCode);
  }
  const discountCents = applyPromo(priceCents, promo);

  // 3. Read Google Calendar *before* taking the lock (network call), then re-check everything under the lock.
  let googleBusy: BusyInterval[] | undefined;
  if (calendarConfigured()) {
    const { start, end } = sydneyDayRange(input.date);
    const pad = settings.travelBufferMins * 60_000;
    try {
      googleBusy = await getGoogleBusy(new Date(start.getTime() - pad), new Date(end.getTime() + pad));
    } catch (e) {
      console.error("[booking] Google Calendar read failed", e);
      throw new BookingError("We couldn't check the calendar just now. Please try again in a minute or call us.", "CALENDAR_UNAVAILABLE");
    }
  }

  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`;

        if (input.staffOverride) {
          // Staff can book outside normal hours, but never on top of another lesson or Google event.
          const clash = await tx.booking.findFirst({
            where: { instructorId: instructor.id, status: { in: ["CONFIRMED", "COMPLETED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
          });
          const gClash = (googleBusy ?? []).some((g) => startsAt < g.end && endsAt > g.start);
          if (clash || gClash) throw new BookingError("That time overlaps another lesson or calendar event.", "SLOT_TAKEN");
        } else {
          const { slots } = await getAvailability(input.date, durationMins, { db: tx, googleBusy: googleBusy ?? [] });
          if (!slots.some((s) => s.startMin === input.startMin)) {
            throw new BookingError("Sorry — that time was just taken or is no longer available. Please pick another time.", "SLOT_TAKEN");
          }
        }

        if (creditPurchaseId) {
          const used = await tx.packagePurchase.updateMany({
            where: { id: creditPurchaseId, creditsUsed: { lt: tx.packagePurchase.fields.creditsTotal } },
            data: { creditsUsed: { increment: 1 } },
          });
          if (used.count !== 1) throw new BookingError("You don't have any package lessons left.", "NO_CREDITS");
        }
        if (promo) {
          const ok = await tx.promoCode.updateMany({
            where: { id: promo.id, OR: [{ maxUses: null }, { uses: { lt: promo.maxUses ?? 0 } }] },
            data: { uses: { increment: 1 } },
          });
          if (ok.count !== 1) throw new BookingError("That promo code has been fully used.", "PROMO");
        }

        return tx.booking.create({
          data: {
            ref: shortRef(),
            manageToken: secretToken(),
            userId: input.userId ?? null,
            customerName: input.customerName.trim(),
            customerEmail: input.customerEmail.trim().toLowerCase(),
            customerPhone: input.customerPhone.trim(),
            lessonTypeId,
            title,
            packagePurchaseId: creditPurchaseId,
            instructorId: instructor.id,
            startsAt,
            endsAt,
            durationMins,
            pickupAddress: input.pickupAddress.trim(),
            pickupSuburb: input.pickupSuburb.trim(),
            customerNotes: input.customerNotes?.trim() || null,
            priceCents,
            discountCents,
            promoCodeId: promo?.id ?? null,
            paymentStatus: creditPurchaseId ? "CREDIT" : priceCents - discountCents === 0 ? "FREE" : "UNPAID",
            calendarSync: calendarConfigured() ? "PENDING" : "NOT_CONFIGURED",
            createdByStaff: Boolean(input.createdByStaff),
          },
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (isOverlapViolation(e)) {
      throw new BookingError("Sorry — that time was just taken. Please pick another time.", "SLOT_TAKEN");
    }
    throw e;
  }

  await syncToCalendar(booking.id);
  await sendEmail(emails.confirmation(booking));
  if (process.env.OWNER_EMAIL) await sendEmail(emails.ownerNewBooking(booking, process.env.OWNER_EMAIL));
  return booking;
}

export async function validatePromo(code: string) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.active) throw new BookingError("That promo code isn't valid.", "PROMO");
  if (promo.expiresAt && promo.expiresAt < new Date()) throw new BookingError("That promo code has expired.", "PROMO");
  if (promo.maxUses != null && promo.uses >= promo.maxUses) throw new BookingError("That promo code has been fully used.", "PROMO");
  return promo;
}

/** Create or update the Google Calendar event for a booking. Never throws — failures are retried by cron. */
export async function syncToCalendar(bookingId: string) {
  if (!calendarConfigured()) return;
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) return;
  try {
    if (b.status === "CANCELLED") {
      if (b.googleEventId) await deleteCalendarEvent(b.googleEventId);
      await prisma.booking.update({ where: { id: b.id }, data: { calendarSync: "SYNCED", calendarError: null } });
      return;
    }
    if (b.googleEventId) {
      await updateCalendarEvent(b.googleEventId, b);
      await prisma.booking.update({ where: { id: b.id }, data: { calendarSync: "SYNCED", calendarError: null } });
    } else {
      const eventId = await createCalendarEvent(b);
      await prisma.booking.update({ where: { id: b.id }, data: { googleEventId: eventId, calendarSync: "SYNCED", calendarError: null } });
    }
  } catch (e) {
    console.error("[calendar] sync failed", e);
    await prisma.booking.update({ where: { id: b.id }, data: { calendarSync: "FAILED", calendarError: String(e).slice(0, 500) } });
  }
}

export function canCustomerChange(b: { startsAt: Date; status: string }, windowHours: number) {
  return b.status === "CONFIRMED" && b.startsAt.getTime() - Date.now() >= windowHours * 3_600_000;
}

export async function cancelBooking(bookingId: string, opts: { byStaff?: boolean; reason?: string | null } = {}) {
  const settings = await getSettings();
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.status !== "CONFIRMED") throw new BookingError("This booking can't be cancelled.", "NOT_ALLOWED");
  if (!opts.byStaff && !canCustomerChange(b, settings.cancellationWindowHours)) {
    throw new BookingError(
      `Lessons can only be cancelled online more than ${settings.cancellationWindowHours} hours before the start. Please call us.`,
      "NOT_ALLOWED",
    );
  }
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.booking.update({
      where: { id: b.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: opts.reason ?? null, calendarSync: calendarConfigured() ? "PENDING" : "NOT_CONFIGURED" },
    });
    if (b.packagePurchaseId) {
      await tx.packagePurchase.updateMany({ where: { id: b.packagePurchaseId, creditsUsed: { gt: 0 } }, data: { creditsUsed: { decrement: 1 } } });
    }
    if (b.promoCodeId) {
      await tx.promoCode.updateMany({ where: { id: b.promoCodeId, uses: { gt: 0 } }, data: { uses: { decrement: 1 } } });
    }
    return u;
  });
  await syncToCalendar(b.id);
  await sendEmail(emails.cancelled(updated, opts.reason));
  await notifyWaitlist(b.startsAt);
  return updated;
}

export async function rescheduleBooking(bookingId: string, date: string, startMin: number, opts: { byStaff?: boolean } = {}) {
  const settings = await getSettings();
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.status !== "CONFIRMED") throw new BookingError("This booking can't be changed.", "NOT_ALLOWED");
  if (!opts.byStaff && !canCustomerChange(b, settings.cancellationWindowHours)) {
    throw new BookingError(`Lessons can only be moved online more than ${settings.cancellationWindowHours} hours before the start. Please call us.`, "NOT_ALLOWED");
  }
  let googleBusy: BusyInterval[] = [];
  if (calendarConfigured()) {
    const { start, end } = sydneyDayRange(date);
    const pad = settings.travelBufferMins * 60_000;
    try {
      googleBusy = await getGoogleBusy(new Date(start.getTime() - pad), new Date(end.getTime() + pad));
    } catch {
      throw new BookingError("We couldn't check the calendar just now. Please try again shortly.", "CALENDAR_UNAVAILABLE");
    }
  }
  const startsAt = sydneyToUtc(date, startMin);
  const endsAt = new Date(startsAt.getTime() + b.durationMins * 60_000);
  let updated;
  try {
    updated = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`;
        const { slots } = await getAvailability(date, b.durationMins, { db: tx, googleBusy, excludeBookingId: b.id });
        if (!slots.some((s) => s.startMin === startMin)) throw new BookingError("Sorry — that time isn't available. Please pick another.", "SLOT_TAKEN");
        return tx.booking.update({
          where: { id: b.id },
          data: { startsAt, endsAt, reminder24SentAt: null, reminder2SentAt: null, calendarSync: calendarConfigured() ? "PENDING" : "NOT_CONFIGURED" },
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (isOverlapViolation(e)) throw new BookingError("Sorry — that time was just taken.", "SLOT_TAKEN");
    throw e;
  }
  await syncToCalendar(b.id);
  await sendEmail(emails.rescheduled(updated, b.startsAt));
  await notifyWaitlist(b.startsAt);
  return updated;
}

/** When a slot frees up, email everyone waiting for that day (once). */
export async function notifyWaitlist(freedStart: Date) {
  const date = todaySydney(freedStart);
  if (date < todaySydney()) return;
  const entries = await prisma.waitlistEntry.findMany({ where: { date, notifiedAt: null } });
  for (const w of entries) {
    await sendEmail(emails.waitlistOpening(w.email, w.name, fmtDate(sydneyDayRange(date).start)));
    await prisma.waitlistEntry.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
  }
}

export async function creditBalance(userId: string) {
  const purchases = await prisma.packagePurchase.findMany({
    where: { userId, status: { in: ["PAID", "PENDING_PAYMENT"] } },
    include: { package: true },
  });
  return {
    remaining: purchases.reduce((n, p) => n + (p.creditsTotal - p.creditsUsed), 0),
    purchases,
  };
}
