"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Phone, User } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, SITE } from "@/lib/site";
import { useSession } from "@/lib/auth-client";

export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const accountHref = role && role !== "CUSTOMER" ? "/admin" : "/account";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${SITE.name} home`} onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-brand-50 aria-[current=page]:text-brand-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={`tel:${SITE.phoneTel}`} className="btn-ghost btn-sm hidden whitespace-nowrap xl:inline-flex">
            <Phone className="size-4" aria-hidden /> {SITE.phoneDisplay}
          </a>
          <Link href={session ? accountHref : "/login"} className="btn-ghost btn-sm hidden whitespace-nowrap sm:inline-flex">
            <User className="size-4" aria-hidden /> {session ? "My account" : "Log in"}
          </Link>
          <Link href="/book" className="btn-primary btn-sm hidden whitespace-nowrap sm:inline-flex">
            Book a lesson
          </Link>
          <button
            type="button"
            className="btn-ghost btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-white lg:hidden">
          <ul className="container-x flex flex-col py-2">
            {[...NAV, { href: session ? accountHref : "/login", label: session ? "My account" : "Log in" }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-base font-semibold hover:bg-brand-50">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`tel:${SITE.phoneTel}`} className="block px-2 py-3 font-semibold text-brand-700">
                Call {SITE.phoneDisplay}
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
