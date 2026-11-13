import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDateTime, fmtDate } from "@/lib/time";
import { PageHeader } from "../_components/PageHeader";
import { ALL_STAFF } from "../_lib/roles";
import { removePushDevice } from "../actions/push";
import { PhoneAppSetup } from "./PhoneAppSetup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Phone app & alerts" };

export default async function PhoneAppPage() {
  const user = await requireStaff(ALL_STAFF);
  const devices = await prisma.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader title="Phone app & alerts" subtitle="Install the admin on your phone and get a ping for every new booking." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PhoneAppSetup />
        <div className="space-y-4">
          <section className="card" aria-labelledby="what">
            <h2 id="what" className="font-bold">You&apos;ll be alerted when</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>🚗 Someone books online (split lessons show every session)</li>
              <li>❌ A customer cancels a lesson</li>
              <li>🔁 A customer moves a lesson</li>
              <li>✉️ Someone sends an enquiry from the Contact page</li>
            </ul>
            <p className="mt-2 text-xs text-muted">Bookings and changes you make yourself in the admin don&apos;t send alerts. Tap an alert to open that booking.</p>
          </section>
          <section className="card" aria-labelledby="dev">
            <h2 id="dev" className="font-bold">Your devices with alerts on</h2>
            {devices.length === 0 ? (
              <p className="mt-2 text-sm text-muted">None yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold">{d.device || "Device"}</span>
                      <span className="block text-xs text-muted">
                        Added {fmtDate(d.createdAt)}
                        {d.lastUsedAt ? ` · last alert ${fmtDateTime(d.lastUsedAt)}` : ""}
                      </span>
                    </span>
                    <form action={removePushDevice}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="btn-ghost btn-sm text-danger">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
