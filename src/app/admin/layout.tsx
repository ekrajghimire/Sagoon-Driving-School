import type { Metadata } from "next";
import { requireStaff } from "@/lib/session";
import { ADMIN_NAV } from "./_lib/roles";
import { AdminNav } from "./_components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const items = ADMIN_NAV.filter((i) => i.roles.includes(user.role));
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <AdminNav items={items} userName={user.name} role={user.role} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
