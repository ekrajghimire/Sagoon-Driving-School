import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { OWNER_ONLY } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { promoteByEmail, changeRole } from "../actions/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & roles" };

const ROLE_INFO: Record<string, string> = {
  OWNER: "Everything, including settings and user roles",
  STAFF: "Bookings, customers, pricing, content, reports — not settings or roles",
  INSTRUCTOR: "Today's schedule, bookings, lesson notes & progress, own availability",
};

export default async function UsersPage() {
  const me = await requireStaff(OWNER_ONLY);
  const team = await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Users & roles" subtitle="Who can access this admin area." />
      <ul className="mb-6 grid gap-2 text-sm sm:grid-cols-3">
        {Object.entries(ROLE_INFO).map(([r, d]) => (
          <li key={r} className="card p-4"><p className="font-bold">{r.charAt(0) + r.slice(1).toLowerCase()}</p><p className="text-muted">{d}</p></li>
        ))}
      </ul>

      <section className="card" aria-labelledby="add-h">
        <h2 id="add-h" className="font-bold">Give someone access</h2>
        <p className="text-sm text-muted">They must first create an account on the website (Log in → Create account). Then enter their email here.</p>
        <ActionForm action={promoteByEmail} className="mt-3 flex flex-wrap items-end gap-2" resetOnSuccess>
          <label className="label">Email<input name="email" type="email" required className="input mt-1" /></label>
          <label className="label">Role
            <select name="role" className="input mt-1"><option value="STAFF">Admin staff</option><option value="INSTRUCTOR">Instructor</option><option value="OWNER">Owner</option></select>
          </label>
          <SubmitButton>Grant access</SubmitButton>
        </ActionForm>
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="table-x min-w-[600px]">
          <thead className="bg-surface"><tr><th>Name</th><th>Email</th><th>Role</th><th>Since</th><th></th></tr></thead>
          <tbody>
            {team.map((u) => (
              <tr key={u.id}>
                <td><Link href={`/admin/customers/${u.id}`} className="font-semibold text-brand-700 hover:underline">{u.name}</Link>{u.id === me.id && <span className="text-xs text-muted"> (you)</span>}</td>
                <td className="break-all">{u.email}</td>
                <td>{u.role.toLowerCase()}</td>
                <td>{fmtDate(u.createdAt)}</td>
                <td>
                  {u.id !== me.id && (
                    <ActionForm action={changeRole} hideSuccess>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value="CUSTOMER" />
                      <SubmitButton className="btn-ghost btn-sm" confirm={`Remove admin access for ${u.name}?`}>Remove access</SubmitButton>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
