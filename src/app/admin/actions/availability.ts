"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, getInstructor } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { sydneyToUtc, sydneyDayRange, isIsoDate } from "@/lib/time";
import { attempt, str, bool, hhmmToMinutes, UserError } from "../_lib/action-utils";
import { ALL_STAFF, ADMINS } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

function touch() {
  revalidatePath("/admin/availability");
  revalidatePath("/admin/bookings");
}

const hoursSchema = z
  .array(z.object({ weekday: z.number().int().min(0).max(6), start: z.string(), end: z.string() }))
  .max(50);

export async function saveWorkingHours(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const rows = hoursSchema.parse(JSON.parse(str(fd, "hours") || "[]"));
    const instructor = await getInstructor();
    const parsed = rows.map((r) => ({ weekday: r.weekday, startMin: hhmmToMinutes(r.start), endMin: hhmmToMinutes(r.end) }));
    for (const r of parsed) if (r.endMin <= r.startMin) throw new UserError("Each range must end after it starts.");
    for (let wd = 0; wd < 7; wd++) {
      const day = parsed.filter((r) => r.weekday === wd).sort((a, b) => a.startMin - b.startMin);
      for (let i = 1; i < day.length; i++) if (day[i].startMin < day[i - 1].endMin) throw new UserError("Time ranges on the same day can't overlap.");
    }
    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { instructorId: instructor.id } }),
      prisma.workingHours.createMany({ data: parsed.map((r) => ({ ...r, instructorId: instructor.id })) }),
    ]);
    touch();
    return "Working hours saved";
  });
}

export async function addBlockedTime(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    const date = str(fd, "date");
    const endDate = str(fd, "endDate") || date;
    if (!isIsoDate(date) || !isIsoDate(endDate) || endDate < date) throw new UserError("Choose valid dates.");
    const allDay = bool(fd, "allDay");
    const startsAt = allDay ? sydneyDayRange(date).start : sydneyToUtc(date, hhmmToMinutes(str(fd, "start")));
    const endsAt = allDay ? sydneyDayRange(endDate).end : sydneyToUtc(endDate, hhmmToMinutes(str(fd, "end")));
    if (endsAt <= startsAt) throw new UserError("The end must be after the start.");
    await prisma.blockedTime.create({ data: { startsAt, endsAt, reason: str(fd, "reason").slice(0, 120) || null } });
    const clashes = await prisma.booking.count({ where: { status: "CONFIRMED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    touch();
    return clashes
      ? `Blocked. ⚠ ${clashes} existing booking(s) fall in this period — they are NOT cancelled automatically; check Bookings.`
      : "Time blocked — it's no longer offered online";
  });
}

export async function deleteBlockedTime(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ALL_STAFF);
  return attempt(async () => {
    await prisma.blockedTime.delete({ where: { id: z.string().min(1).parse(str(fd, "id")) } });
    touch();
    return "Removed";
  });
}

export async function addHoliday(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z.object({ date: z.string().refine(isIsoDate, "Invalid date"), name: z.string().trim().min(2).max(80) }).parse({ date: str(fd, "date"), name: str(fd, "name") });
    await prisma.publicHoliday.upsert({ where: { date: d.date }, update: { name: d.name }, create: d });
    touch();
    return "Holiday saved — no online bookings that day";
  });
}

export async function deleteHoliday(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.publicHoliday.delete({ where: { id: z.string().min(1).parse(str(fd, "id")) } });
    touch();
    return "Holiday removed";
  });
}

export async function saveBookingRules(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const n = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
    const d = z
      .object({
        slotIntervalMins: n(5, 120),
        travelBufferMins: n(0, 120),
        minNoticeHours: n(0, 168),
        maxAdvanceDays: n(7, 365),
        cancellationWindowHours: n(0, 168),
      })
      .parse({
        slotIntervalMins: str(fd, "slotIntervalMins"),
        travelBufferMins: str(fd, "travelBufferMins"),
        minNoticeHours: str(fd, "minNoticeHours"),
        maxAdvanceDays: str(fd, "maxAdvanceDays"),
        cancellationWindowHours: str(fd, "cancellationWindowHours"),
      });
    const allowedDurations = fd
      .getAll("allowedDurations")
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 30 && v <= 240);
    if (!allowedDurations.length) throw new UserError("Select at least one lesson length.");
    await prisma.settings.update({ where: { id: 1 }, data: { ...d, allowedDurations: [...new Set(allowedDurations)].sort((a, b) => a - b) } });
    touch();
    revalidatePath("/book");
    return "Booking rules saved";
  });
}
