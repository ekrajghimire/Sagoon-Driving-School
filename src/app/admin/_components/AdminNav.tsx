"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ExternalLink,
  House,
  CalendarDays,
  CalendarPlus,
  Users,
  CalendarClock,
  Tag,
  FileText,
  Inbox,
  ChartColumn,
  Settings,
  UserCog,
  BellRing,
  Ellipsis,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import type { NavItem } from "../_lib/roles";

const ICONS: Record<string, LucideIcon> = {
  "/admin": House,
  "/admin/bookings": CalendarDays,
  "/admin/bookings/new": CalendarPlus,
  "/admin/customers": Users,
  "/admin/availability": CalendarClock,
  "/admin/pricing": Tag,
  "/admin/content": FileText,
  "/admin/inbox": Inbox,
  "/admin/reports": ChartColumn,
  "/admin/settings": Settings,
  "/admin/app": BellRing,
  "/admin/users": UserCog,
};

/** Shown in the phone bottom bar (in this order, if the user's role has them); everything else lives under "More". */
const PRIMARY = ["/admin", "/admin/bookings", "/admin/bookings/new", "/admin/customers", "/admin/availability"];
const SHORT: Record<string, string> = { "/admin/bookings/new": "New", "/admin/availability": "Hours" };

function isActive(path: string, href: string) {
  if (href === "/admin") return path === "/admin";
  if (href === "/admin/bookings") return path.startsWith("/admin/bookings") && !path.startsWith("/admin/bookings/new");
  return path === href || path.startsWith(`${href}/`);
}

export function AdminNav({ items, userName, role, inboxCount = 0 }: { items: NavItem[]; userName: string; role: string; inboxCount?: number }) {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const primary = PRIMARY.map((h) => items.find((i) => i.href === h)).filter((i): i is NavItem => Boolean(i)).slice(0, 4);
  const moreActive = !primary.some((i) => isActive(path, i.href));

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const logout = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const badge = (href: string) =>
    href === "/admin/inbox" && inboxCount > 0 ? (
      <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-ink" aria-label={`${inboxCount} new`}>
        {inboxCount}
      </span>
    ) : null;

  return (
    <>
      {/* Phone / tablet: slim top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex min-h-11 items-center font-extrabold">
          Sagoon <span className="ml-1 rounded bg-accent px-1.5 text-xs font-bold text-ink">Admin</span>
        </Link>
        <Link href="/" className="btn-ghost btn-sm" aria-label="View website">
          <ExternalLink className="size-5" aria-hidden />
        </Link>
      </header>

      {/* Phone / tablet: bottom tab bar */}
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,42,67,0.06)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {primary.map((i) => {
            const Icon = ICONS[i.href] ?? House;
            const active = isActive(path, i.href);
            return (
              <li key={i.href} className="flex-1">
                <Link
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted transition active:bg-brand-50 aria-[current=page]:text-brand-700"
                >
                  <Icon className="size-5" aria-hidden strokeWidth={active ? 2.5 : 2} />
                  {SHORT[i.href] ?? i.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition active:bg-brand-50 ${moreActive ? "text-brand-700" : "text-muted"}`}
            >
              <Ellipsis className="size-5" aria-hidden />
              More
              {inboxCount > 0 && <span className="absolute right-1/2 top-2 size-2 translate-x-4 rounded-full bg-danger" aria-label="New messages" />}
            </button>
          </li>
        </ul>
      </nav>

      {/* Phone / tablet: "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All admin pages">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-extrabold">{userName}</p>
                <p className="text-xs capitalize text-muted">{role.toLowerCase()}</p>
              </div>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setMoreOpen(false)} aria-label="Close menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {items.map((i) => {
                const Icon = ICONS[i.href] ?? House;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={isActive(path, i.href) ? "page" : undefined}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold transition hover:border-brand-500 active:bg-brand-50 aria-[current=page]:border-brand-700 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{i.label}</span>
                      {badge(i.href)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              <Link href="/" className="btn-outline" onClick={() => setMoreOpen(false)}>
                <ExternalLink className="size-4" aria-hidden /> View site
              </Link>
              <button type="button" onClick={logout} disabled={signingOut} className="btn-outline">
                <LogOut className="size-4" aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/admin" className="px-2 text-lg font-extrabold">
            Sagoon <span className="rounded bg-accent px-1.5 text-xs font-bold text-ink">Admin</span>
          </Link>
          <p className="px-2 text-xs text-muted">
            {userName} · <span className="capitalize">{role.toLowerCase()}</span>
          </p>
          <nav aria-label="Admin" className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {items.map((i) => {
              const Icon = ICONS[i.href] ?? House;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={isActive(path, i.href) ? "page" : undefined}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-white aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {i.label}
                  {badge(i.href)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3">
            <Link href="/" className="btn-ghost btn-sm justify-start">
              <ExternalLink className="size-4" aria-hidden /> View site
            </Link>
            <button type="button" onClick={logout} disabled={signingOut} className="btn-ghost btn-sm justify-start">
              <LogOut className="size-4" aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
