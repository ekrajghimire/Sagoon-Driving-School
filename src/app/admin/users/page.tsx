import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { OWNER_ONLY } from "../_lib/roles";
import { PageHeader, SectionTitle } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { promoteByEmail, changeRole } from "../actions/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & roles" };

const ROLE_INFO: Record<string, [string, string]> = {
  OWNER: ["Owner", "Everything, including settings and user roles"],
  STAFF: ["Admin staff", "Bookings, customers, pricing, content, reports — not settings or roles"],
  INSTRUCTOR: ["Instructor", "Today's schedule, bookings, lesson notes & progress, own availability"],
};
const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-accent text-ink",
  STAFF: "bg-brand-100 text-brand-800",
  INSTRUCTOR: "bg-green-100 text-ok",
};

export default async function UsersPage() {
  const me = await requireStaff(OWNER_ONLY);
  const team = await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Users & roles" subtitle="Who can access this admin area." />
      <ul className="mb-6 grid gap-2 text-sm sm:grid-cols-3">
        {Object.entries(ROLE_INFO).map(([r, [name, d]]) => (
          <li key={r} className="card p-4">
            <span className={`badge ${ROLE_BADGE[r]}`}>{name}</span>
            <p className="mt-1 text-muted">{d}</p>
          </li>
        ))}
      </ul>

      <section className="card" aria-labelledby="add-h">
        <h2 id="add-h" className="font-bold">Give someone access</h2>
        <p className="text-sm text-muted">They must first create an account on the website (Log in → Create account). Then enter their email here.</p>
        <ActionForm action={promoteByEmail} className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end" resetOnSuccess>
          <div>
            <label className="label" htmlFor="pe">Email</label>
            <input id="pe" name="email" type="email" inputMode="email" autoComplete="off" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="pr">Role</label>
            <select id="pr" name="role" className="input">
              <option value="STAFF">Admin staff</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <SubmitButton className="btn-brand" confirm="Give this person access to the admin area?">
            Grant access
          </SubmitButton>
        </ActionForm>
      </section>

      <section className="mt-6" aria-labelledby="team-h">
        <SectionTitle id="team-h">Team ({team.length})</SectionTitle>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {team.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <Link href={`/admin/customers/${u.id}`} className="font-semibold text-brand-700 hover:underline">
                  {u.name}
                </Link>
                {u.id === me.id && <span className="text-xs text-muted"> (you)</span>}
                <p className="break-all text-sm text-muted">{u.email}</p>
                <p className="text-xs text-muted">Since {fmtDate(u.createdAt)}</p>
              </div>
              <span className={`badge ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-700"}`}>{ROLE_INFO[u.role]?.[0] ?? u.role}</span>
              {u.id !== me.id && (
                <ActionForm action={changeRole} hideSuccess>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="role" value="CUSTOMER" />
                  <SubmitButton className="btn-danger btn-sm" confirm={`Remove admin access for ${u.name}? They'll keep their customer account.`}>
                    Remove access
                  </SubmitButton>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
