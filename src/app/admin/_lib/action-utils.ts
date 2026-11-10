import "server-only";
import { ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";
import { BookingError } from "@/lib/booking-service";
import type { ActionState } from "./types";

/** A user-facing validation error thrown inside admin actions. */
export class UserError extends Error {}

/** "customDuration" → "Custom duration" (for validation messages). */
function humanise(key: string) {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Run an admin mutation and convert errors into a friendly ActionState. */
export async function attempt(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Saved" };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ZodError) {
      const i = e.issues[0];
      return { error: i ? `${i.path.length ? `${humanise(String(i.path.at(-1)))}: ` : ""}${i.message}` : "Invalid input" };
    }
    if (e instanceof BookingError || e instanceof UserError) return { error: e.message };
    const code = (e as { code?: unknown } | null)?.code;
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("Booking_no_overlap") || msg.includes("exclusion constraint") || msg.includes("23P01")) {
      return { error: "That would overlap another lesson." };
    }
    if (code === "P2002" || msg.includes("Unique constraint")) return { error: "That value is already in use (must be unique)." };
    if (code === "P2025" || msg.includes("Record to update not found") || msg.includes("Record to delete does not exist")) {
      return { error: "That item no longer exists — refresh the page." };
    }
    if (e instanceof SyntaxError) return { error: "The form data was invalid — refresh the page and try again." };
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

/** Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(e: unknown) {
  return (e as { code?: unknown } | null)?.code === "P2002" || String((e as Error)?.message ?? "").includes("Unique constraint");
}

/**
 * "75" or "75.50" → 7500 / 7550.
 * Rejects negatives, junk such as "1e9" / "abc", more than 2 decimals and amounts over `maxDollars`
 * (an Int column overflows at ~$21M, which would otherwise crash the action).
 */
export function dollarsToCents(v: string, maxDollars = 100_000) {
  const clean = v.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new UserError("Please enter a valid amount in dollars, e.g. 75 or 75.50.");
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) throw new UserError("Please enter a valid amount in dollars.");
  if (n > maxDollars) throw new UserError(`That amount looks too high (max $${maxDollars.toLocaleString("en-AU")}).`);
  return Math.round(n * 100);
}

/** "07:30" → 450 */
export function hhmmToMinutes(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) throw new UserError(v.trim() ? `Invalid time "${v}" (use HH:MM).` : "Please enter a time.");
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
