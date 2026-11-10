import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff, isOwnerOrAdmin } from "@/lib/session";
import { ADMIN_NAV } from "./_lib/roles";
import { AdminNav } from "./_components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const items = ADMIN_NAV.filter((i) => i.roles.includes(user.role));
  const inboxCount = isOwnerOrAdmin(user.role) ? await prisma.contactMessage.count({ where: { handled: false } }).catch(() => 0) : 0;
  return (
    // On phones/tablets every small button and input grows to a 44px tap target.
    <div className="flex min-h-screen flex-col bg-white max-lg:[&_.btn-sm]:min-h-11 max-lg:[&_.input]:min-h-11 lg:flex-row">
      <AdminNav items={items} userName={user.name} role={user.role} inboxCount={inboxCount} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
