import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountTabs } from "./AccountTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "My account", template: "%s | Sagoon Driving School" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="bg-surface py-8 sm:py-10">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Hi, {user.name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role !== "CUSTOMER" && <Link href="/admin" className="btn-outline btn-sm">Admin dashboard</Link>}
            <SignOutButton />
          </div>
        </div>
        <AccountTabs />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
