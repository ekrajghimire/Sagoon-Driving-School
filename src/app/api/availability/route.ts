import { NextResponse, type NextRequest } from "next/server";
import { getAvailability } from "@/lib/booking-service";
import { prisma } from "@/lib/db";
import { isIsoDate } from "@/lib/time";

export const dynamic = "force-dynamic";

/** GET /api/availability?date=YYYY-MM-DD&duration=60[&manage=<token>] → open start times for that day. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date") ?? "";
  const duration = Number(sp.get("duration"));
  if (!isIsoDate(date) || !Number.isInteger(duration) || duration < 30 || duration > 300) {
    return NextResponse.json({ error: "Invalid date or duration" }, { status: 400 });
  }
  let excludeBookingId: string | undefined;
  const manage = sp.get("manage");
  if (manage) excludeBookingId = (await prisma.booking.findUnique({ where: { manageToken: manage }, select: { id: true } }))?.id;

  const { slots, calendarOk } = await getAvailability(date, duration, { excludeBookingId });
  return NextResponse.json(
    { date, calendarOk, slots: slots.map((s) => ({ startMin: s.startMin, label: s.label, start: s.start.toISOString() })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
