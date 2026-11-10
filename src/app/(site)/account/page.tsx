import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { creditBalance } from "@/lib/booking-service";
import { BookingList } from "@/components/BookingList";
import { SKILLS } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function AccountHome() {
  const user = await requireUser();
  const [upcoming, credits, ratings, completed] = await Promise.all([
    prisma.booking.findMany({ where: { userId: user.id, status: "CONFIRMED", endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 5 }),
    creditBalance(user.id),
    prisma.skillRating.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.booking.count({ where: { userId: user.id, status: "COMPLETED" } }),
  ]);
  const latest = new Map<string, number>();
  for (const r of ratings) if (!latest.has(r.skill)) latest.set(r.skill, r.rating);
  const ready = [...latest.values()].filter((v) => v >= 4).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2" aria-labelledby="up">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="up" className="text-xl font-bold">Upcoming lessons</h2>
          <Link href="/book" className="btn-primary btn-sm">Book a lesson</Link>
        </div>
        <BookingList items={upcoming} empty={<>No upcoming lessons. <Link href="/book" className="font-semibold text-brand-700 underline">Book one now</Link>.</>} />
      </section>
      <div className="space-y-6">
        <section className="card">
          <h2 className="font-bold">Package lessons</h2>
          <p className="mt-2 text-4xl font-extrabold">{credits.remaining}</p>
          <p className="text-sm text-muted">lessons left to book</p>
          <Link href={credits.remaining ? "/book" : "/pricing#packages"} className="btn-outline btn-sm mt-4">{credits.remaining ? "Book with a credit" : "Get a package"}</Link>
        </section>
        <section className="card">
          <h2 className="font-bold">Your progress</h2>
          <p className="mt-2 text-sm text-muted">{completed} lesson{completed === 1 ? "" : "s"} completed · {ready}/{SKILLS.length} skills confident</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={SKILLS.length} aria-valuenow={ready} aria-label="Skills confident">
            <div className="h-full rounded-full bg-ok" style={{ width: `${(ready / SKILLS.length) * 100}%` }} />
          </div>
          <Link href="/account/progress" className="btn-ghost btn-sm mt-3">See skills checklist</Link>
        </section>
        {!user.licenceNumber && (
          <section className="card border-amber-200 bg-amber-50">
            <h2 className="font-bold">Add your learner details</h2>
            <p className="mt-1 text-sm">Licence number and test date help us plan your lessons.</p>
            <Link href="/account/profile" className="btn-outline btn-sm mt-3">Update profile</Link>
          </section>
        )}
      </div>
    </div>
  );
}
