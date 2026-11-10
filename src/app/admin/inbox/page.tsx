import { Download, Mail, Phone, Trash2, Check, Undo2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDateTime, todaySydney, sydneyDayRange, fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader, EmptyState, SectionTitle } from "../_components/PageHeader";
import { StatusBadge } from "../_components/StatusBadge";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { toggleHandled, deleteMessage, deleteWaitlistEntry, deleteSubscriber } from "../actions/inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireStaff(ADMINS);
  const today = todaySydney();
  const [messages, newCount, waitlist, subsCount, subs] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 100 }),
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.waitlistEntry.findMany({ where: { date: { gte: today } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }], take: 200 }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.findMany({ orderBy: { consentAt: "desc" }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader title="Inbox" subtitle="Enquiries, waitlist and newsletter sign-ups." />

      <section aria-labelledby="msg-h">
        <SectionTitle id="msg-h">
          Messages {newCount > 0 && <span className="badge ml-1 align-middle bg-accent text-ink">{newCount} new</span>}
        </SectionTitle>
        {messages.length === 0 ? (
          <EmptyState title="No messages yet">Enquiries from the website contact form will appear here.</EmptyState>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const tel = (m.phone ?? "").replace(/[^\d+]/g, "");
              return (
                <article key={m.id} className={`card p-4 ${m.handled ? "bg-surface/60" : "border-l-4 border-l-accent"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {m.name} <StatusBadge status={m.handled ? "HANDLED" : "NEW"} className="ml-1 align-middle" />
                      </p>
                      <p className="text-xs text-muted">{fmtDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                  <p className={`mt-2 whitespace-pre-wrap break-words text-sm ${m.handled ? "text-muted" : ""}`}>{m.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a className="btn-outline btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your enquiry — Sagoon Driving School")}`}>
                      <Mail className="size-4" aria-hidden /> Reply
                    </a>
                    {tel && (
                      <a className="btn-outline btn-sm" href={`tel:${tel}`}>
                        <Phone className="size-4" aria-hidden /> Call
                      </a>
                    )}
                    <ActionForm action={toggleHandled} hideSuccess>
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton className={m.handled ? "btn-ghost btn-sm" : "btn-brand btn-sm"}>
                        {m.handled ? <Undo2 className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
                        {m.handled ? "Mark as new" : "Mark handled"}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteMessage} hideSuccess>
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton className="btn-ghost btn-sm text-danger" confirm={`Delete the message from ${m.name}? This can't be undone.`}>
                        <Trash2 className="size-4" aria-hidden /> Delete
                      </SubmitButton>
                    </ActionForm>
                  </div>
                  <p className="mt-2 break-all text-xs text-muted">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="waitlist" className="mt-10 scroll-mt-20" aria-labelledby="wl-h">
        <SectionTitle id="wl-h">Waitlist ({waitlist.length})</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-muted">Customers are emailed automatically when a lesson on their day is cancelled or moved.</p>
        {waitlist.length === 0 ? (
          <EmptyState title="Nobody on the waitlist" />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {waitlist.map((w) => {
              const tel = w.phone.replace(/[^\d+]/g, "");
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-semibold">{fmtDate(sydneyDayRange(w.date).start)}</p>
                    <p className="text-sm">
                      {w.name} ·{" "}
                      <a className="font-semibold text-brand-700" href={`tel:${tel}`}>
                        {w.phone}
                      </a>
                    </p>
                    <p className="break-all text-xs text-muted">{w.email}</p>
                    {w.notes && <p className="mt-1 text-xs text-muted">“{w.notes}”</p>}
                  </div>
                  <span className={`badge ${w.notifiedAt ? "bg-green-100 text-ok" : "bg-slate-100 text-slate-700"}`}>
                    {w.notifiedAt ? `Notified ${fmtDateTime(w.notifiedAt)}` : "Waiting"}
                  </span>
                  <ActionForm action={deleteWaitlistEntry} hideSuccess>
                    <input type="hidden" name="id" value={w.id} />
                    <SubmitButton className="btn-ghost btn-sm" confirm={`Remove ${w.name} from the waitlist?`}>
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="nl-h">
        <SectionTitle
          id="nl-h"
          aside={
            subsCount > 0 && (
              <a href="/admin/inbox/newsletter" className="btn-outline btn-sm" download>
                <Download className="size-4" aria-hidden /> Export CSV
              </a>
            )
          }
        >
          Newsletter subscribers ({subsCount})
        </SectionTitle>
        {subs.length === 0 ? (
          <EmptyState title="No subscribers yet" />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="min-w-0 break-all">
                    {s.email} <span className="text-xs text-muted">· {fmtDate(s.consentAt)}</span>
                  </span>
                  <ActionForm action={deleteSubscriber} hideSuccess>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton className="btn-ghost btn-sm" confirm={`Unsubscribe ${s.email}?`}>
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
            {subsCount > subs.length && <p className="mt-2 text-xs text-muted">Showing the latest {subs.length}. Export the CSV for the full list.</p>}
          </>
        )}
      </section>
    </>
  );
}
