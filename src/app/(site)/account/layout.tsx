import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "My account", template: "%s | Sagoon Driving School" }, robots: { index: false } };

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/lessons", label: "Lessons" },
  { href: "/account/packages", label: "Packages" },
  { href: "/account/progress", label: "Progress" },
  { href: "/account/profile", label: "Profile" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="bg-surface py-8">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="text-3xl font-extrabold">Hi, {user.name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex gap-2">
            {user.role !== "CUSTOMER" && <Link href="/admin" className="btn-outline btn-sm">Admin dashboard</Link>}
            <SignOutButton />
          </div>
        </div>
        <nav aria-label="Account" className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-50">{t.label}</Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
