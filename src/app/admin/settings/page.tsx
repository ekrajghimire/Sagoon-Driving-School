import { prisma, getSettings, getInstructor } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { calendarConfigured } from "@/lib/google-calendar";
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

export default async function SettingsPage() {
  await requireStaff(OWNER_ONLY);
  const [s, instructor, vehicle] = await Promise.all([getSettings(), getInstructor(), prisma.vehicle.findFirst({ where: { active: true } })]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Business details shown on the website, invoices and emails." />

      <section className="card" aria-labelledby="int-h">
        <h2 id="int-h" className="text-lg font-bold">Integrations</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          <Status ok={calendarConfigured()} label="Google Calendar sync" hint="GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY" />
          <Status ok={has("SMTP_HOST", "SMTP_USER", "SMTP_PASS")} label="Email sending (SMTP)" hint="SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM — without it emails are only logged" />
          <Status ok={has("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")} label="“Continue with Google” login" hint="GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET" />
          <Status ok={has("CRON_SECRET")} label="Reminders & review requests (cron)" hint="CRON_SECRET plus a scheduled job calling /api/cron" />
          <Status ok={has("OWNER_EMAIL")} label="Owner notifications" hint="OWNER_EMAIL — receives new booking & enquiry emails" />
        </ul>
        <p className="mt-2 text-xs text-muted">Secrets are set in your hosting provider&apos;s environment variables and are never shown here.</p>
      </section>

      <section className="card mt-4" aria-labelledby="biz-h">
        <h2 id="biz-h" className="text-lg font-bold">Business details</h2>
        <ActionForm action={saveBusiness} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Business name<input name="businessName" required defaultValue={s.businessName} className="input mt-1" /></label>
          <label className="label">Phone<input name="phone" required defaultValue={s.phone} className="input mt-1" /></label>
          <label className="label">Email<input name="email" type="email" required defaultValue={s.email} className="input mt-1" /></label>
          <label className="label">Address (for invoices)<input name="address" required defaultValue={s.address} className="input mt-1" /></label>
          <label className="label">ABN<input name="abn" required defaultValue={s.abn} className="input mt-1" /></label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="gstRegistered" defaultChecked={s.gstRegistered} /> Registered for GST (invoices say “Tax Invoice”)</label>
          <label className="label">PayID<input name="payId" defaultValue={s.payId} className="input mt-1" placeholder="e.g. 0451 634 722" /></label>
          <label className="label">WhatsApp number (with country code)<input name="whatsappNumber" defaultValue={s.whatsappNumber} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Payment instructions<textarea name="paymentInstructions" rows={2} defaultValue={s.paymentInstructions} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Google reviews link<input name="googleReviewsUrl" type="url" defaultValue={s.googleReviewsUrl} className="input mt-1" placeholder="https://g.page/r/…/review" /></label>
          <label className="label">Pass rate (only real figures)<input name="statPassRate" defaultValue={s.statPassRate} className="input mt-1" placeholder="e.g. 92%" /></label>
          <label className="label">Students taught<input name="statStudents" defaultValue={s.statStudents} className="input mt-1" placeholder="e.g. 300+" /></label>
          <label className="label sm:col-span-2">Announcement banner (optional)<input name="announcement" defaultValue={s.announcement} className="input mt-1" placeholder="e.g. Closed 24 Dec – 2 Jan" /></label>
          <label className="label sm:col-span-2">Suburbs serviced (one per line)<textarea name="suburbs" rows={6} defaultValue={s.suburbs.join("\n")} className="input mt-1" /></label>
          <div className="sm:col-span-2"><SubmitButton>Save business details</SubmitButton></div>
        </ActionForm>
      </section>

      <section className="card mt-4" aria-labelledby="ins-h">
        <h2 id="ins-h" className="text-lg font-bold">Instructor profile</h2>
        <ActionForm action={saveInstructor} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Name<input name="name" required defaultValue={instructor.name} className="input mt-1" /></label>
          <label className="label">Accreditation / licence<input name="accreditation" defaultValue={instructor.accreditation} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Bio<textarea name="bio" rows={5} defaultValue={instructor.bio} className="input mt-1" /></label>
          <label className="label">Languages (comma or one per line)<input name="languages" defaultValue={instructor.languages.join(", ")} className="input mt-1" /></label>
          <label className="label">Photo URL (https)<input name="photoUrl" type="url" defaultValue={instructor.photoUrl ?? ""} className="input mt-1" /></label>
          <div className="sm:col-span-2"><SubmitButton>Save instructor</SubmitButton></div>
        </ActionForm>
      </section>

      <section className="card mt-4" aria-labelledby="car-h">
        <h2 id="car-h" className="text-lg font-bold">Car</h2>
        <ActionForm action={saveVehicle} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Make & model<input name="name" required defaultValue={vehicle?.name ?? ""} className="input mt-1" /></label>
          <label className="label">Photo URL (https)<input name="photoUrl" type="url" defaultValue={vehicle?.photoUrl ?? ""} className="input mt-1" /></label>
          <label className="label sm:col-span-2">Features (one per line)<textarea name="features" rows={5} defaultValue={vehicle?.features.join("\n") ?? ""} className="input mt-1" /></label>
          <p className="text-sm text-muted sm:col-span-2">Transmission: Automatic (the school teaches automatic only).</p>
          <div className="sm:col-span-2"><SubmitButton>Save car</SubmitButton></div>
        </ActionForm>
      </section>
    </>
  );
}
