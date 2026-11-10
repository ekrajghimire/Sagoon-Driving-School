import { prisma } from "@/lib/db";
import { toCsv, csvResponse, staffFromRequest } from "../../_lib/csv";
import { ADMINS } from "../../_lib/roles";

export const dynamic = "force-dynamic";

/** GET /admin/customers/export → CSV of registered customers + guest bookers (staff only). */
export async function GET(req: Request) {
  const user = await staffFromRequest(req, ADMINS);
  if (!user) return new Response("Forbidden", { status: 403 });

  const [users, guests] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      include: {
        bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, select: { startsAt: true } },
        purchases: { where: { status: { in: ["PAID", "PENDING_PAYMENT"] } }, select: { creditsTotal: true, creditsUsed: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ["customerEmail", "customerName", "customerPhone"],
      where: { userId: null },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { startsAt: true },
    }),
  ]);

  const rows: unknown[][] = users.map((u) => [
    "registered",
    u.name,
    u.email,
    u.phone ?? "",
    u.licenceNumber ?? "",
    u.licenceType ?? "",
    u.testDate ? u.testDate.toISOString().slice(0, 10) : "",
    u.bookings.length,
    u.purchases.reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0),
    u.marketingOptIn ? "yes" : "no",
    u.createdAt.toISOString(),
  ]);
  for (const g of guests) {
    rows.push(["guest", g.customerName, g.customerEmail, g.customerPhone, "", "", "", g._count._all, 0, "no", g._min.createdAt?.toISOString() ?? ""]);
  }
  const csv = toCsv(
    ["type", "name", "email", "phone", "licence_number", "licence_type", "test_date", "lessons", "credits_left", "marketing_opt_in", "created_at"],
    rows,
  );
  return csvResponse(`sagoon-customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
