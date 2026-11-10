import { prisma, getSettings, getInstructor } from "@/lib/db";
import { requireStaff, isOwnerOrAdmin } from "@/lib/session";
import { calendarConfigured } from "@/lib/google-calendar";
import { fmtDateTime, todaySydney, sydneyDayRange } from "@/lib/time";
import { ALL_STAFF } from "../_lib/roles";
import { minutesToHHMM } from "../_lib/dates";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { addBlockedTime, deleteBlockedTime, addHoliday, deleteHoliday, saveBookingRules } from "../actions/availability";
import { WorkingHoursEditor } from "./WorkingHoursEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

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
      <PageHeader title="Availability" subtitle="Controls which times customers can book online." />
      <p className="mb-4 rounded-xl bg-brand-50 p-3 text-sm">
        {calendarConfigured()
          ? "✓ Google Calendar is connected: any event in your calendar marked “Busy” (appointments, days off, all-day busy events) automatically blocks those times on the website."
          : "Tip: connect Google Calendar (see setup guide) and any busy event in your calendar will automatically block those times here too."}
      </p>

      <section className="card" aria-labelledby="wh-h">
        <h2 id="wh-h" className="text-lg font-bold">Weekly working hours</h2>
        <p className="text-sm text-muted">Times in Sydney local time. Lessons must start and finish inside these hours.</p>
        <WorkingHoursEditor initial={hours.map((h) => ({ weekday: h.weekday, start: minutesToHHMM(h.startMin), end: minutesToHHMM(h.endMin) }))} />
      </section>

      <section className="card mt-4" aria-labelledby="bt-h">
        <h2 id="bt-h" className="text-lg font-bold">Block out time</h2>
        <p className="text-sm text-muted">Holidays, appointments, car service… Blocked time isn&apos;t offered to customers.</p>
        <ActionForm action={addBlockedTime} className="mt-3 grid gap-3 sm:grid-cols-6" resetOnSuccess>
          <label className="label sm:col-span-2">From date<input name="date" type="date" required min={today} className="input mt-1" /></label>
          <label className="label sm:col-span-2">To date (optional)<input name="endDate" type="date" min={today} className="input mt-1" /></label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm sm:col-span-2"><input type="checkbox" name="allDay" /> All day</label>
          <label className="label sm:col-span-2">Start time<input name="start" type="time" step={900} defaultValue="09:00" className="input mt-1" /></label>
          <label className="label sm:col-span-2">End time<input name="end" type="time" step={900} defaultValue="12:00" className="input mt-1" /></label>
          <label className="label sm:col-span-2">Reason (private)<input name="reason" className="input mt-1" placeholder="e.g. Car service" /></label>
          <div className="sm:col-span-6"><SubmitButton>Block time</SubmitButton></div>
        </ActionForm>
        <ul className="mt-4 divide-y divide-line">
          {blocked.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span><strong>{fmtDateTime(b.startsAt)}</strong> → {fmtDateTime(b.endsAt)} {b.reason && <span className="text-muted">· {b.reason}</span>}</span>
              <ActionForm action={deleteBlockedTime} hideSuccess>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton className="btn-ghost btn-sm" confirm="Remove this blocked time?">Remove</SubmitButton>
              </ActionForm>
            </li>
          ))}
          {!blocked.length && <li className="py-2 text-sm text-muted">No upcoming blocked time.</li>}
        </ul>
      </section>

      {isAdmin && (
        <>
          <section className="card mt-4" aria-labelledby="ph-h">
            <h2 id="ph-h" className="text-lg font-bold">Public holidays</h2>
            <p className="text-sm text-muted">No online bookings on these dates. Check the official NSW list each year.</p>
            <ActionForm action={addHoliday} className="mt-3 flex flex-wrap items-end gap-2" resetOnSuccess>
              <label className="label">Date<input name="date" type="date" required className="input mt-1" /></label>
              <label className="label">Name<input name="name" required className="input mt-1" placeholder="e.g. Labour Day" /></label>
              <SubmitButton>Add holiday</SubmitButton>
            </ActionForm>
            <ul className="mt-3 divide-y divide-line">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span><strong>{h.date}</strong> · {h.name}</span>
                  <ActionForm action={deleteHoliday} hideSuccess>
                    <input type="hidden" name="id" value={h.id} />
                    <SubmitButton className="btn-ghost btn-sm" confirm="Remove this holiday? Customers will be able to book that day.">Remove</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </section>

          <section className="card mt-4" aria-labelledby="rules-h">
            <h2 id="rules-h" className="text-lg font-bold">Booking rules</h2>
            <ActionForm action={saveBookingRules} className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="label">Start times every (min)<input name="slotIntervalMins" type="number" min={5} max={120} defaultValue={settings.slotIntervalMins} className="input mt-1" /></label>
              <label className="label">Travel buffer between lessons (min)<input name="travelBufferMins" type="number" min={0} max={120} defaultValue={settings.travelBufferMins} className="input mt-1" /></label>
              <label className="label">Minimum notice (hours)<input name="minNoticeHours" type="number" min={0} max={168} defaultValue={settings.minNoticeHours} className="input mt-1" /></label>
              <label className="label">Book up to (days ahead)<input name="maxAdvanceDays" type="number" min={7} max={365} defaultValue={settings.maxAdvanceDays} className="input mt-1" /></label>
              <label className="label">Free cancellation window (hours)<input name="cancellationWindowHours" type="number" min={0} max={168} defaultValue={settings.cancellationWindowHours} className="input mt-1" /></label>
              <fieldset className="sm:col-span-3">
                <legend className="label">Lesson lengths offered</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  {[60, 90, 120, 150, 180].map((m) => (
                    <label key={m} className="flex items-center gap-2"><input type="checkbox" name="allowedDurations" value={m} defaultChecked={settings.allowedDurations.includes(m)} /> {m / 60} hr{m > 60 ? "s" : ""}</label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-3"><SubmitButton>Save rules</SubmitButton></div>
            </ActionForm>
          </section>
        </>
      )}
    </>
  );
}
