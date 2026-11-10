"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Phone, User, CalendarCheck } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, SITE } from "@/lib/site";
import { useSession } from "@/lib/auth-client";

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const accountHref = role && role !== "CUSTOMER" ? "/admin" : "/account";
  const accountLabel = session ? "My account" : "Log in";
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes (adjusting state during render, per React docs).
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  // Escape closes the menu and returns focus to the toggle; clicks outside close it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !toggleRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-3 lg:gap-4">
        <Link href="/" aria-label={`${SITE.name} home`} className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        {/* Desktop nav: only from lg (1024px) so labels never wrap; phone number only from xl. */}
        <nav aria-label="Main" className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className="rounded-lg px-2.5 py-2 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700 xl:px-3"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a href={`tel:${SITE.phoneTel}`} className="btn-ghost btn-sm hidden whitespace-nowrap xl:inline-flex">
            <Phone className="size-4" aria-hidden /> {SITE.phoneDisplay}
          </a>
          <Link
            href={session ? accountHref : "/login"}
            aria-current={isActive(path, session ? accountHref : "/login") ? "page" : undefined}
            className="btn-ghost btn-sm hidden whitespace-nowrap sm:inline-flex"
          >
            <User className="size-4" aria-hidden /> {accountLabel}
          </Link>
          <Link href="/book" className="btn-primary btn-sm hidden whitespace-nowrap sm:inline-flex">
            Book a lesson
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="btn-ghost btn-sm size-11 px-0 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        // Dims the page behind the menu. Absolute (not fixed): the header's backdrop-filter makes it the containing block.
        <div aria-hidden className="animate-fade-in absolute inset-x-0 top-full h-dvh bg-ink/25 lg:hidden" />
      )}
      {open && (
        <div ref={menuRef} id="mobile-nav" className="animate-pop-in absolute inset-x-0 top-full border-b border-line bg-white shadow-lg lg:hidden">
          <nav aria-label="Mobile" className="container-x max-h-[calc(100dvh-4rem)] overflow-y-auto py-3">
            <ul className="grid gap-0.5 sm:grid-cols-2 sm:gap-x-4">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(path, n.href) ? "page" : undefined}
                    className="flex min-h-12 items-center rounded-xl px-3 text-base font-semibold transition-colors hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
              <li className="sm:hidden">
                <Link
                  href={session ? accountHref : "/login"}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <User className="size-5 text-brand-600" aria-hidden /> {accountLabel}
                </Link>
              </li>
            </ul>
            <div className="mt-3 border-t border-line pt-4 pb-1">
              <Link href="/book" onClick={() => setOpen(false)} className="btn-primary w-full">
                <CalendarCheck className="size-5" aria-hidden /> Book a lesson
              </Link>
              <p className="mt-3 text-center text-sm text-muted">
                Prefer to talk? Call{" "}
                <a href={`tel:${SITE.phoneTel}`} className="link-underline whitespace-nowrap">
                  {SITE.phoneDisplay}
                </a>
              </p>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
