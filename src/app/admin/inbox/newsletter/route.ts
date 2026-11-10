import { prisma } from "@/lib/db";
import { toCsv, csvResponse, staffFromRequest } from "../../_lib/csv";
import { ADMINS } from "../../_lib/roles";

export const dynamic = "force-dynamic";

/** GET /admin/inbox/newsletter → CSV of newsletter subscribers (staff only). */
export async function GET(req: Request) {
  if (!(await staffFromRequest(req, ADMINS))) return new Response("Forbidden", { status: 403 });
  const subs = await prisma.newsletterSubscriber.findMany({ orderBy: { consentAt: "asc" } });
  return csvResponse(
    `sagoon-newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
    toCsv(["email", "consent_at"], subs.map((s) => [s.email, s.consentAt])),
  );
}
