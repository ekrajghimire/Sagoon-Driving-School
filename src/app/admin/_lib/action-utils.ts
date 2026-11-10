import "server-only";
import { ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";
import { BookingError } from "@/lib/booking-service";
import type { ActionState } from "./types";

/** A user-facing validation error thrown inside admin actions. */
export class UserError extends Error {}

/** Run an admin mutation and convert errors into a friendly ActionState. */
export async function attempt(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Saved" };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ZodError) {
      const i = e.issues[0];
      return { error: i ? `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}` : "Invalid input" };
    }
    if (e instanceof BookingError || e instanceof UserError) return { error: e.message };
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("Booking_no_overlap") || msg.includes("exclusion constraint")) return { error: "That would overlap another lesson." };
    if (msg.includes("Unique constraint")) return { error: "That value is already in use (must be unique)." };
    console.error("[admin action]", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

/** "75" or "75.50" → 7500 / 7550 */
export function dollarsToCents(v: string) {
  const n = Number(v.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new UserError("Please enter a valid price.");
  return Math.round(n * 100);
}

/** "07:30" → 450 */
export function hhmmToMinutes(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) throw new UserError(`Invalid time "${v}" (use HH:MM).`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) throw new UserError(`Invalid time "${v}".`);
  return h * 60 + min;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
