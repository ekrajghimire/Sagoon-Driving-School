import { prisma, getSettings, getInstructor } from "@/lib/db";
import { requireStaff, isOwnerOrAdmin } from "@/lib/session";
import { calendarConfigured } from "@/lib/google-calendar";
import { fmtDate, fmtDateTime, fmtTime, todaySydney, sydneyDayRange, sydneyMinutes } from "@/lib/time";
import { ALL_STAFF } from "../_lib/roles";
import { minutesToHHMM } from "../_lib/dates";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { deleteBlockedTime, addHoliday, deleteHoliday, saveBookingRules } from "../actions/availability";
import { WorkingHoursEditor } from "./WorkingHoursEditor";
import { BlockTimeForm } from "./BlockTimeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

/** "Tue 10 Nov 2026, 9:00 AM → 12:00 PM" or "Tue 10 Nov – Fri 13 Nov (all day)". */
function describeBlock(start: Date, end: Date) {
  const startDay = fmtDate(start);
  const lastDay = fmtDate(new Date(end.getTime() - 1));
  const midnight = (d: Date) => sydneyMinutes(d) === 0;
  if (midnight(start) && midnight(end)) return startDay === lastDay ? `${startDay} (all day)` : `${startDay} – ${lastDay} (all day)`;
  if (startDay === fmtDate(end)) return `${startDay}, ${fmtTime(start)} – ${fmtTime(end)}`;
  return `${fmtDateTime(start)} → ${fmtDateTime(end)}`;
}

export default async function AvailabilityPage() {
  const user = await requireStaff(ALL_STAFF);
  const isAdmin = isOwnerOrAdmin(user.role);
  const instructor = await getInstructor();
  const today = todaySydney();
  const [hours, blocked, holidays, settings] = await Promise.all([
    prisma.workingHours.findMany({ where: { instructorId: instructor.id }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] }),
    prisma.blockedTime.findMany({ where: { endsAt: { gt: sydneyDayRange(today).start } }, orderBy: { startsAt: "asc" } }),
    prisma.publicHoliday.findMany({ where: { date: { gte: today } }, orderBy: { date: "asc" } }),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader title="Availability" subtitle="Controls which times customers can book online. All times are Sydney time." />
      <p className={`mb-4 rounded-xl p-3 text-sm ${calendarConfigured() ? "bg-green-50 text-ok" : "bg-brand-50"}`}>
        {calendarConfigured()
          ? "Google Calendar is connected: any event in your calendar marked “Busy” automatically blocks those times on the website."
          : "Tip: connect Google Calendar (Settings → Integrations) and any busy event in your calendar will automatically block those times here too."}
      </p>

      <section className="card" aria-labelledby="bt-h">
        <h2 id="bt-h" className="text-lg font-bold">Block out time</h2>
        <p className="text-sm text-muted">Holidays, appointments, car service… Blocked time isn&apos;t offered to customers. Existing bookings are not cancelled.</p>
        <BlockTimeForm today={today} />
        <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">Upcoming blocks</h3>
        <ul className="mt-1 divide-y divide-line">
          {blocked.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <strong>{describeBlock(b.startsAt, b.endsAt)}</strong>
                {b.reason && <span className="block text-muted">{b.reason}</span>}
              </span>
              <ActionForm action={deleteBlockedTime} hideSuccess>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton className="btn-ghost btn-sm" confirm="Remove this blocked time? Customers will be able to book it again.">
                  Remove
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
          {!blocked.length && <li className="py-2 text-sm text-muted">No upcoming blocked time.</li>}
        </ul>
      </section>

      <section className="card mt-4" aria-labelledby="wh-h">
        <h2 id="wh-h" className="text-lg font-bold">Weekly working hours</h2>
        <p className="text-sm text-muted">Lessons must start and finish inside these hours. Add two blocks on a day for a lunch break.</p>
        <WorkingHoursEditor initial={hours.map((h) => ({ weekday: h.weekday, start: minutesToHHMM(h.startMin), end: minutesToHHMM(h.endMin) }))} />
      </section>

      {isAdmin && (
        <>
          <section className="card mt-4" aria-labelledby="ph-h">
            <h2 id="ph-h" className="text-lg font-bold">Public holidays</h2>
            <p className="text-sm text-muted">No online bookings on these dates. Check the official NSW list each year.</p>
            <ActionForm action={addHoliday} className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end" resetOnSuccess>
              <label className="label">
                Date
                <input name="date" type="date" required min={today} className="input mt-1" />
              </label>
              <label className="label">
                Name
                <input name="name" required minLength={2} maxLength={80} className="input mt-1" placeholder="e.g. Labour Day" />
              </label>
              <SubmitButton className="btn-brand">Add holiday</SubmitButton>
            </ActionForm>
            <ul className="mt-3 divide-y divide-line">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <strong>{fmtDate(sydneyDayRange(h.date).start)}</strong> · {h.name}
                  </span>
                  <ActionForm action={deleteHoliday} hideSuccess>
                    <input type="hidden" name="id" value={h.id} />
                    <SubmitButton className="btn-ghost btn-sm" confirm={`Remove ${h.name}? Customers will be able to book that day.`}>
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
              {!holidays.length && <li className="py-2 text-sm text-muted">No upcoming holidays added.</li>}
            </ul>
          </section>

          <section className="card mt-4" aria-labelledby="rules-h">
            <h2 id="rules-h" className="text-lg font-bold">Booking rules</h2>
            <ActionForm action={saveBookingRules} className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="label">
                Start times every (min)
                <input name="slotIntervalMins" type="number" inputMode="numeric" required min={5} max={120} defaultValue={settings.slotIntervalMins} className="input mt-1" />
              </label>
              <label className="label">
                Travel buffer between lessons (min)
                <input name="travelBufferMins" type="number" inputMode="numeric" required min={0} max={120} defaultValue={settings.travelBufferMins} className="input mt-1" />
              </label>
              <label className="label">
                Minimum notice (hours)
                <input name="minNoticeHours" type="number" inputMode="numeric" required min={0} max={168} defaultValue={settings.minNoticeHours} className="input mt-1" />
              </label>
              <label className="label">
                Book up to (days ahead)
                <input name="maxAdvanceDays" type="number" inputMode="numeric" required min={7} max={365} defaultValue={settings.maxAdvanceDays} className="input mt-1" />
              </label>
              <label className="label">
                Free cancellation window (hours)
                <input name="cancellationWindowHours" type="number" inputMode="numeric" required min={0} max={168} defaultValue={settings.cancellationWindowHours} className="input mt-1" />
              </label>
              <fieldset className="sm:col-span-3">
                <legend className="label">Lesson lengths offered</legend>
                <div className="flex flex-wrap gap-x-5">
                  {[60, 90, 120, 150, 180].map((m) => (
                    <label key={m} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" name="allowedDurations" value={m} defaultChecked={settings.allowedDurations.includes(m)} className="size-5" /> {m / 60} hr{m > 60 ? "s" : ""}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-3">
                <SubmitButton>Save rules</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </>
      )}
    </>
  );
}
