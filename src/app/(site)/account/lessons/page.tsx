import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { BookingList } from "@/components/BookingList";

export const dynamic = "force-dynamic";
export const metadata = { title: "My lessons" };

export default async function LessonsPage() {
  const user = await requireUser("/account/lessons");
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({ where: { userId: user.id, status: "CONFIRMED", endsAt: { gt: now } }, orderBy: { startsAt: "asc" } }),
    prisma.booking.findMany({ where: { userId: user.id, OR: [{ status: { not: "CONFIRMED" } }, { endsAt: { lte: now } }] }, orderBy: { startsAt: "desc" }, take: 100 }),
  ]);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-bold">Upcoming</h2>
        <BookingList items={upcoming} empty={<>Nothing booked. <Link href="/book" className="font-semibold text-brand-700 underline">Book a lesson</Link>.</>} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Past & cancelled</h2>
        <BookingList items={past} empty="No past lessons yet." />
      </section>
      <p className="text-sm text-muted">Booked as a guest before creating an account? Contact us and we&apos;ll link those lessons to your account.</p>
    </div>
  );
}
