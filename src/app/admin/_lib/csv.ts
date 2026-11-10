import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Escape a CSV cell and neutralise spreadsheet formula injection: any text starting (after optional
 * whitespace) with = + - @ or a tab / CR / LF is prefixed with an apostrophe so Excel / Sheets show it as text.
 * Real numbers are left alone so they stay numeric.
 */
export function csvCell(v: unknown) {
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string) {
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Route-handler auth: returns the DB user if they hold one of `roles`, else null. */
export async function staffFromRequest(req: Request, roles: readonly string[]) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return null;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    return user && roles.includes(user.role) ? user : null;
  } catch (e) {
    console.error("[admin csv] session check failed", e);
    return null;
  }
}
