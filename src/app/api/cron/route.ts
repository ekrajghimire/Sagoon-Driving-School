import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma, getSettings } from "@/lib/db";
import { sendEmail, emails } from "@/lib/email";
import { syncToCalendar } from "@/lib/booking-service";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

/**
 * Runs every ~15 minutes (free GitHub Actions schedule, see .github/workflows/cron.yml):
 *  - 24-hour and 2-hour email reminders
 *  - auto-complete lessons 6h after they end (unless marked no-show) + review request email
 *  - retry any Google Calendar syncs that failed
 */
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const now = Date.now();
  const H = 3_600_000;
  const out = { reminders24: 0, reminders2: 0, completed: 0, reviews: 0, calendarRetried: 0 };

  const due24 = await prisma.booking.findMany({
    where: { status: "CONFIRMED", reminder24SentAt: null, startsAt: { gt: new Date(now + 3 * H), lte: new Date(now + 24 * H) } },
    take: 50,
  });
  for (const b of due24) {
    await sendEmail(emails.reminder(b, 24));
    await prisma.booking.update({ where: { id: b.id }, data: { reminder24SentAt: new Date() } });
    out.reminders24++;
  }

  const due2 = await prisma.booking.findMany({
    where: { status: "CONFIRMED", reminder2SentAt: null, startsAt: { gt: new Date(now), lte: new Date(now + 2 * H) } },
    take: 50,
  });
  for (const b of due2) {
    await sendEmail(emails.reminder(b, 2));
    await prisma.booking.update({ where: { id: b.id }, data: { reminder2SentAt: new Date() } });
    out.reminders2++;
  }

  const done = await prisma.booking.updateMany({ where: { status: "CONFIRMED", endsAt: { lt: new Date(now - 6 * H) } }, data: { status: "COMPLETED" } });
  out.completed = done.count;

  const settings = await getSettings();
  const reviewUrl = settings.googleReviewsUrl || `${SITE.url}/reviews`;
  const toReview = await prisma.booking.findMany({
    where: { status: "COMPLETED", reviewRequestSentAt: null, endsAt: { gt: new Date(now - 72 * H), lt: new Date(now - 1 * H) } },
    take: 50,
  });
  // Only ask once per customer every 60 days.
  for (const b of toReview) {
    const recent = await prisma.booking.count({ where: { customerEmail: b.customerEmail, reviewRequestSentAt: { gt: new Date(now - 60 * 24 * H) } } });
    if (!recent) {
      await sendEmail(emails.reviewRequest(b, reviewUrl));
      out.reviews++;
    }
    await prisma.booking.update({ where: { id: b.id }, data: { reviewRequestSentAt: new Date() } });
  }

  const unsynced = await prisma.booking.findMany({
    where: { calendarSync: { in: ["FAILED", "PENDING"] }, updatedAt: { lt: new Date(now - 2 * 60_000) } },
    select: { id: true },
    take: 20,
  });
  for (const b of unsynced) {
    await syncToCalendar(b.id);
    out.calendarRetried++;
  }

  return NextResponse.json({ ok: true, ...out });
}
