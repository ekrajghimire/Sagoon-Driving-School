"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/lessons", label: "Lessons" },
  { href: "/account/packages", label: "Packages" },
  { href: "/account/progress", label: "Progress" },
  { href: "/account/profile", label: "Profile" },
];

/** Account section tabs with the current page highlighted. Scrolls sideways on narrow phones. */
export function AccountTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max min-w-full gap-1 rounded-xl border border-line bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const active = t.href === "/account" ? path === t.href : path === t.href || path.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="block rounded-lg px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
