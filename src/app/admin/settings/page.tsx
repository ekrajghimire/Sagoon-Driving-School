import { prisma, getSettings, getInstructor } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { calendarConfigured, checkCalendarWrite } from "@/lib/google-calendar";
import { testEmailSetup } from "@/lib/email";
import { sendPush } from "@/lib/push";
import { fmtDateTime } from "@/lib/time";
import { OWNER_ONLY } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { saveBusiness, saveInstructor, saveVehicle } from "../actions/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const has = (...keys: string[]) => keys.every((k) => Boolean(process.env[k]));

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${ok ? "bg-ok" : "bg-amber-500"}`}>{ok ? "✓" : "!"}</span>
      <span>
        <span className="font-semibold">{label}</span> — <span className={ok ? "text-ok" : "text-amber-700"}>{ok ? "configured" : "not configured"}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </li>
  );
}

function Result({ title, ok, message, detail, warn }: { title: string; ok: boolean; message: string; detail?: string; warn?: boolean }) {
  const tone = ok ? "border-green-200 bg-green-50" : warn ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50";
  return (
    <li className={`rounded-xl border p-3 text-sm ${tone}`}>
      <p className={`font-semibold ${ok ? "text-ok" : warn ? "text-amber-800" : "text-danger"}`}>
        {ok ? "✓" : warn ? "!" : "✗"} {title}
      </p>
      <p className="mt-1 text-ink">{message}</p>
      {detail && <p className="mt-2 break-all font-mono text-xs text-muted">Details: {detail}</p>}
    </li>
  );
}

/** Runs every integration for real (test email, calendar write, phone alert) and shows exactly what's wrong. */
async function Diagnostics({ userId }: { userId: string }) {
  const owner = (process.env.OWNER_EMAIL ?? "").split(",")[0]?.trim() ?? "";
  const [email, calendar, devices, recent] = await Promise.all([
    testEmailSetup(owner),
    calendarConfigured()
      ? checkCalendarWrite()
      : Promise.resolve({ ok: false, message: "Google Calendar isn't set up: add GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel, then redeploy. Until then lessons won't appear in your calendar.", detail: undefined }),
    prisma.pushSubscription.findMany({ where: { userId } }),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, customerName: true, startsAt: true, createdAt: true, createdByStaff: true, calendarSync: true, calendarError: true } }),
  ]);
  const push = devices.length
    ? await sendPush(devices, { title: "🔔 Test alert — Sagoon Admin", body: "Phone alerts are working.", url: "/admin/app", tag: "test" })
    : null;

  return (
    <div className="mt-4 space-y-3" role="status">
      <ul className="space-y-2">
        <Result title="Email" {...email} />
        <Result title="Google Calendar" {...calendar} />
        <Result
          title="Phone alerts"
          ok={Boolean(push?.sent)}
          warn={!push}
          message={
            !push
              ? "Alerts aren't turned on for any of your devices yet. On your phone open Admin → More → Phone app & alerts and tap Turn on alerts."
              : push.sent
                ? `Test alert sent to ${push.sent} device${push.sent === 1 ? "" : "s"}. Bookings you add yourself in the admin don't send alerts — only online bookings do.`
                : "Your device(s) didn't accept the alert. Open Phone app & alerts on the phone and turn alerts off and on again."
          }
        />
        <Result
          title="Reminder schedule"
          ok={Boolean(process.env.CRON_SECRET)}
          warn
          message={process.env.CRON_SECRET ? "CRON_SECRET is set. Make sure cron-job.org calls /api/cron every 15 minutes (see the setup guide)." : "CRON_SECRET isn't set, so reminders and the owner setup code won't work."}
        />
      </ul>
      {recent.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="table-x min-w-[520px]">
            <caption className="px-3 pt-2 text-left text-xs font-semibold text-muted">Latest bookings — Google Calendar status</caption>
            <thead><tr><th>Booked</th><th>Customer</th><th>Lesson</th><th>Calendar</th></tr></thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(b.createdAt)}{b.createdByStaff ? " (by you)" : ""}</td>
                  <td><a className="font-semibold text-brand-700 underline" href={`/admin/bookings/${b.id}`}>{b.customerName}</a></td>
                  <td className="whitespace-nowrap">{fmtDateTime(b.startsAt)}</td>
                  <td>
                    <span className={b.calendarSync === "SYNCED" ? "text-ok" : b.calendarSync === "FAILED" ? "text-danger" : "text-muted"}>
                      {{ SYNCED: "In calendar", FAILED: "Failed", PENDING: "Waiting", NOT_CONFIGURED: "Calendar not set up" }[b.calendarSync]}
                    </span>
                    {b.calendarError && <span className="block break-all text-xs text-muted">{b.calendarError.slice(0, 160)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <a href="/admin/settings?check=1#int-h" className="btn-outline btn-sm">Run the checks again</a>
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ testCalendar?: string; check?: string }> }) {
  const { testCalendar, check } = await searchParams;
  const user = await requireStaff(OWNER_ONLY);
  const [s, instructor, vehicle] = await Promise.all([getSettings(), getInstructor(), prisma.vehicle.findFirst({ where: { active: true } })]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Business details shown on the website, invoices and emails." />
      <nav aria-label="Settings sections" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[["#int-h", "Integrations"], ["#biz-h", "Business"], ["#ins-h", "Instructor"], ["#car-h", "Car"]].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-sm font-semibold transition hover:border-brand-500 sm:min-h-9">
            {label}
          </a>
        ))}
      </nav>

      <section className="card" aria-labelledby="int-h">
        <h2 id="int-h" className="scroll-mt-20 text-lg font-bold">Integrations</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          <Status ok={calendarConfigured()} label="Google Calendar sync" hint="GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY" />
          <Status ok={has("SMTP_HOST", "SMTP_USER", "SMTP_PASS")} label="Email sending (SMTP)" hint="SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM — without it emails are only logged" />
          <Status ok={has("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")} label="“Continue with Google” login" hint="GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET" />
          <Status ok={has("CRON_SECRET")} label="Reminders & review requests (cron)" hint="CRON_SECRET plus a scheduled job calling /api/cron" />
          <Status ok={has("OWNER_EMAIL")} label="Owner notifications" hint="OWNER_EMAIL — receives new booking & enquiry emails" />
        </ul>
        <p className="mt-2 text-xs text-muted">Secrets are set in your hosting provider&apos;s environment variables and are never shown here.</p>
        {check || testCalendar ? (
          <Diagnostics userId={user.id} />
        ) : (
          <div className="mt-3">
            <a href="/admin/settings?check=1#int-h" className="btn-brand btn-sm">Check everything (sends a test email, calendar event and phone alert)</a>
          </div>
        )}
      </section>

      <section className="card mt-4" aria-labelledby="biz-h">
        <h2 id="biz-h" className="scroll-mt-20 text-lg font-bold">Business details</h2>
        <ActionForm action={saveBusiness} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Business name<input name="businessName" required defaultValue={s.businessName} className="input mt-1" /></label>
          <label className="label">Phone<input name="phone" type="tel" inputMode="tel" required minLength={8} maxLength={30} defaultValue={s.phone} className="input mt-1" /></label>
          <label className="label">Email<input name="email" type="email" required defaultValue={s.email} className="input mt-1" /></label>
          <label className="label">Address (for invoices)<input name="address" required defaultValue={s.address} className="input mt-1" /></label>
          <label className="label">ABN<input name="abn" inputMode="numeric" required defaultValue={s.abn} className="input mt-1" placeholder="11 digits" /></label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="gstRegistered" defaultChecked={s.gstRegistered} className="size-5" /> Registered for GST (invoices say “Tax Invoice”)</label>
          <label className="label">PayID<input name="payId" defaultValue={s.payId} className="input mt-1" placeholder="e.g. 0451 634 722" /></label>
          <label className="label">WhatsApp number<input name="whatsappNumber" type="tel" inputMode="tel" required defaultValue={s.whatsappNumber} className="input mt-1" /><span className="help block font-normal">With country code, e.g. 61451634722 (spaces and + are fine).</span></label>
          <label className="label sm:col-span-2">Payment instructions<textarea name="paymentInstructions" rows={2} maxLength={500} defaultValue={s.paymentInstructions} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Google reviews link<input name="googleReviewsUrl" type="url" defaultValue={s.googleReviewsUrl} className="input mt-1" placeholder="https://g.page/r/…/review" /></label>
          <label className="label">Pass rate (only real figures)<input name="statPassRate" defaultValue={s.statPassRate} className="input mt-1" placeholder="e.g. 92%" /></label>
          <label className="label">Students taught<input name="statStudents" defaultValue={s.statStudents} className="input mt-1" placeholder="e.g. 300+" /></label>
          <label className="label sm:col-span-2">Announcement banner (optional)<input name="announcement" maxLength={200} defaultValue={s.announcement} className="input mt-1" placeholder="e.g. Closed 24 Dec – 2 Jan" /></label>
          <label className="label sm:col-span-2">Suburbs serviced (one per line)<textarea name="suburbs" rows={6} required defaultValue={s.suburbs.join("\n")} className="input mt-1" /></label>
          <div className="sm:col-span-2"><SubmitButton className="btn-brand">Save business details</SubmitButton></div>
        </ActionForm>
      </section>

      <section className="card mt-4" aria-labelledby="ins-h">
        <h2 id="ins-h" className="scroll-mt-20 text-lg font-bold">Instructor profile</h2>
        <ActionForm action={saveInstructor} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Name<input name="name" required defaultValue={instructor.name} className="input mt-1" /></label>
          <label className="label">Accreditation / licence<input name="accreditation" defaultValue={instructor.accreditation} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Bio<textarea name="bio" rows={5} defaultValue={instructor.bio} className="input mt-1" /></label>
          <label className="label">Languages (comma or one per line)<input name="languages" defaultValue={instructor.languages.join(", ")} className="input mt-1" /></label>
          <label className="label">Photo URL (https)<input name="photoUrl" type="url" defaultValue={instructor.photoUrl ?? ""} className="input mt-1" /></label>
          <div className="sm:col-span-2"><SubmitButton className="btn-brand">Save instructor</SubmitButton></div>
        </ActionForm>
      </section>

      <section className="card mt-4" aria-labelledby="car-h">
        <h2 id="car-h" className="scroll-mt-20 text-lg font-bold">Car</h2>
        <ActionForm action={saveVehicle} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Make & model<input name="name" required defaultValue={vehicle?.name ?? ""} className="input mt-1" /></label>
          <label className="label">Photo URL (https)<input name="photoUrl" type="url" defaultValue={vehicle?.photoUrl ?? ""} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Features (one per line)<textarea name="features" rows={5} defaultValue={vehicle?.features.join("\n") ?? ""} className="input mt-1" /></label>
          <p className="text-sm text-muted sm:col-span-2">Transmission: Automatic (the school teaches automatic only).</p>
          <div className="sm:col-span-2"><SubmitButton className="btn-brand">Save car</SubmitButton></div>
        </ActionForm>
      </section>
    </>
  );
}
