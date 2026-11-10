import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDateTime, todaySydney, sydneyDayRange, fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { toggleHandled, deleteMessage, deleteWaitlistEntry, deleteSubscriber } from "../actions/inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireStaff(ADMINS);
  const today = todaySydney();
  const [messages, waitlist, subsCount, subs] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 100 }),
    prisma.waitlistEntry.findMany({ where: { date: { gte: today } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.findMany({ orderBy: { consentAt: "desc" }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader title="Inbox" subtitle="Enquiries, waitlist and newsletter sign-ups." />

      <section aria-labelledby="msg-h">
        <h2 id="msg-h" className="text-xl font-extrabold">Contact messages ({messages.filter((m) => !m.handled).length} new)</h2>
        <div className="mt-3 space-y-2">
          {messages.map((m) => (
            <article key={m.id} className={`card p-4 ${m.handled ? "opacity-60" : "border-l-4 border-l-accent"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{m.name}</p>
                  <p className="text-sm">
                    <a className="text-brand-700 underline" href={`mailto:${m.email}`}>{m.email}</a>
                    {m.phone && <> · <a className="text-brand-700" href={`tel:${m.phone}`}>{m.phone}</a></>}
                  </p>
                </div>
                <p className="text-xs text-muted">{fmtDateTime(m.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={toggleHandled} hideSuccess><input type="hidden" name="id" value={m.id} /><SubmitButton className="btn-outline btn-sm">{m.handled ? "Mark as new" : "Mark handled"}</SubmitButton></ActionForm>
                <ActionForm action={deleteMessage} hideSuccess><input type="hidden" name="id" value={m.id} /><SubmitButton className="btn-ghost btn-sm" confirm="Delete this message?">Delete</SubmitButton></ActionForm>
              </div>
            </article>
          ))}
          {!messages.length && <p className="rounded-xl bg-surface p-4 text-sm text-muted">No messages yet.</p>}
        </div>
      </section>

      <section id="waitlist" className="mt-10" aria-labelledby="wl-h">
        <h2 id="wl-h" className="text-xl font-extrabold">Waitlist ({waitlist.length})</h2>
        <p className="text-sm text-muted">Customers are emailed automatically when a lesson on their day is cancelled or moved.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="table-x min-w-[640px]">
            <thead className="bg-surface"><tr><th>Date wanted</th><th>Name</th><th>Contact</th><th>Notified</th><th></th></tr></thead>
            <tbody>
              {waitlist.map((w) => (
                <tr key={w.id}>
                  <td className="font-semibold">{fmtDate(sydneyDayRange(w.date).start)}</td>
                  <td>{w.name}{w.notes && <span className="block text-xs text-muted">{w.notes}</span>}</td>
                  <td><a className="text-brand-700" href={`tel:${w.phone}`}>{w.phone}</a><br /><span className="text-xs">{w.email}</span></td>
                  <td>{w.notifiedAt ? fmtDateTime(w.notifiedAt) : "Waiting"}</td>
                  <td><ActionForm action={deleteWaitlistEntry} hideSuccess><input type="hidden" name="id" value={w.id} /><SubmitButton className="btn-ghost btn-sm">Remove</SubmitButton></ActionForm></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="nl-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="nl-h" className="text-xl font-extrabold">Newsletter subscribers ({subsCount})</h2>
          <a href="/admin/inbox/newsletter" className="btn-outline btn-sm">Export CSV</a>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="break-all">{s.email} <span className="text-xs text-muted">· {fmtDate(s.consentAt)}</span></span>
              <ActionForm action={deleteSubscriber} hideSuccess><input type="hidden" name="id" value={s.id} /><SubmitButton className="btn-ghost btn-sm" confirm="Remove this subscriber?">Remove</SubmitButton></ActionForm>
            </li>
          ))}
          {!subs.length && <li className="px-4 py-3 text-sm text-muted">No subscribers yet.</li>}
        </ul>
      </section>
    </>
  );
}
