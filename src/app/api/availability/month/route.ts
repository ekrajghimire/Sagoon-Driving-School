import { NextResponse, type NextRequest } from "next/server";
import { getMonthOverview } from "@/lib/booking-service";
import { isIsoDate } from "@/lib/time";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/availability/month?from=YYYY-MM-DD&days=42&duration=60 → { "2026-11-12": 5, … } open-slot counts. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const rawDays = Number(sp.get("days") ?? 42);
  const days = Number.isFinite(rawDays) ? Math.min(62, Math.max(1, Math.trunc(rawDays))) : 42;
  const duration = Number(sp.get("duration"));
  if (!isIsoDate(from) || !Number.isInteger(duration) || duration < 30 || duration > 300) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const manage = sp.get("manage");
  const exclude = manage ? (await prisma.booking.findUnique({ where: { manageToken: manage }, select: { id: true } }))?.id : undefined;
  const counts = await getMonthOverview(from, days, duration, exclude);
  return NextResponse.json({ counts }, { headers: { "Cache-Control": "no-store" } });
}
