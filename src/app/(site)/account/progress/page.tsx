import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SKILLS, RATING_LABELS } from "@/lib/skills";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "My progress" };

export default async function ProgressPage() {
  const user = await requireUser("/account/progress");
  const [ratings, notes] = await Promise.all([
    prisma.skillRating.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({ where: { userId: user.id, status: "COMPLETED", instructorNotes: { not: null } }, orderBy: { startsAt: "desc" }, take: 10, select: { id: true, startsAt: true, instructorNotes: true, title: true } }),
  ]);
  const latest = new Map<string, number>();
  for (const r of ratings) if (!latest.has(r.skill)) latest.set(r.skill, r.rating);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card lg:col-span-2" aria-labelledby="sk">
        <h2 id="sk" className="text-xl font-bold">Skills checklist</h2>
        <p className="mt-1 text-sm text-muted">Your instructor rates each skill after your lessons. Aim for &ldquo;Test ready&rdquo; across the board.</p>
        <ul className="mt-4 space-y-3">
          {SKILLS.map((s) => {
            const v = latest.get(s.key) ?? 0;
            return (
              <li key={s.key}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{v >= 5 ? "✅ " : ""}{s.label}</span>
                  <span className="text-muted">{v ? RATING_LABELS[v] : "Not started"}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={s.label} aria-valuemin={0} aria-valuemax={5} aria-valuenow={v}>
                  <div className={`h-full rounded-full ${v >= 4 ? "bg-ok" : v >= 2 ? "bg-accent" : "bg-brand-200"}`} style={{ width: `${(v / 5) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card h-fit" aria-labelledby="nt">
        <h2 id="nt" className="text-xl font-bold">Instructor notes</h2>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Notes from your lessons will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="font-semibold">{fmtDate(n.startsAt)}</p>
                <p className="whitespace-pre-line text-muted">{n.instructorNotes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
