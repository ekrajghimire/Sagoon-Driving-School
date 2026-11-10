import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Escape a CSV cell and neutralise spreadsheet formula injection (= + - @ tab CR). */
export function csvCell(v: unknown) {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string) {
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Route-handler auth: returns the DB user if they hold one of `roles`, else null. */
export async function staffFromRequest(req: Request, roles: readonly string[]) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return user && roles.includes(user.role) ? user : null;
}
