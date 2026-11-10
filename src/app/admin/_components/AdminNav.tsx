"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ExternalLink } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import type { NavItem } from "../_lib/roles";

function isActive(path: string, href: string) {
  if (href === "/admin") return path === "/admin";
  if (href === "/admin/bookings") return path.startsWith("/admin/bookings") && !path.startsWith("/admin/bookings/new");
  return path.startsWith(href);
}

export function AdminNav({ items, userName, role }: { items: NavItem[]; userName: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <>
      {/* Mobile: horizontal scroll nav */}
      <div className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/admin" className="font-extrabold">Sagoon Admin</Link>
          <div className="flex items-center gap-1">
            <Link href="/" className="btn-ghost btn-sm" aria-label="View site"><ExternalLink className="size-4" /></Link>
            <button onClick={logout} className="btn-ghost btn-sm" aria-label="Sign out"><LogOut className="size-4" /></button>
          </div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(path, i.href) ? "page" : undefined}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-ink aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/admin" className="px-2 text-lg font-extrabold">Sagoon Admin</Link>
          <p className="px-2 text-xs text-muted">{userName} · {role.toLowerCase()}</p>
          <nav aria-label="Admin" className="mt-6 flex flex-col gap-0.5">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(path, i.href) ? "page" : undefined}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-white aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1">
            <Link href="/" className="btn-ghost btn-sm justify-start"><ExternalLink className="size-4" /> View site</Link>
            <button onClick={logout} className="btn-ghost btn-sm justify-start"><LogOut className="size-4" /> Sign out</button>
          </div>
        </div>
      </aside>
    </>
  );
}
