"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cancelBooking, rescheduleBooking, BookingError } from "@/lib/booking-service";
import { rateLimit } from "@/lib/rate-limit";
import { isIsoDate } from "@/lib/time";

export type ManageResult = { ok?: boolean; error?: string };

async function byToken(token: string) {
  if (typeof token !== "string" || token.length < 20) return null;
  return prisma.booking.findUnique({ where: { manageToken: token } });
}

export async function cancelByToken(token: string, reason: string): Promise<ManageResult> {
  if (!(await rateLimit("manage", 20, 600))) return { error: "Too many attempts." };
  const b = await byToken(token);
  if (!b) return { error: "Booking not found." };
  try {
    await cancelBooking(b.id, { reason: reason?.slice(0, 300) || "Cancelled by customer" });
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Couldn't cancel. Please call us." };
  }
  revalidatePath(`/booking/${token}`);
  return { ok: true };
}

export async function rescheduleByToken(token: string, date: string, startMin: number): Promise<ManageResult> {
  if (!(await rateLimit("manage", 20, 600))) return { error: "Too many attempts." };
  if (!isIsoDate(date) || !Number.isInteger(startMin)) return { error: "Invalid time." };
  const b = await byToken(token);
  if (!b) return { error: "Booking not found." };
  try {
    await rescheduleBooking(b.id, date, startMin);
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Couldn't reschedule. Please call us." };
  }
  revalidatePath(`/booking/${token}`);
  return { ok: true };
}
