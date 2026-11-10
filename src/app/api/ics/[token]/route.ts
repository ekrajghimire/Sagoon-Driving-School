import { prisma } from "@/lib/db";
import { icsFor } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await prisma.booking.findUnique({ where: { manageToken: token } });
  if (!b || b.status !== "CONFIRMED") return new Response("Not found", { status: 404 });
  return new Response(icsFor(b, b.ref), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="lesson-${b.ref}.ics"` },
  });
}
