"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, CalendarCheck } from "lucide-react";
import { SITE } from "@/lib/site";

/** The booking flow and manage-booking pages have their own primary actions, so the bar stays out of their way. */
export function showsBookBar(path: string) {
  return !(path === "/book" || path.startsWith("/book/") || path.startsWith("/booking/"));
}

/**
 * Mobile-only sticky call-to-action bar. Renders an in-flow spacer of the same height so the bar
 * never covers the end of the page (footer links, legal text).
 */
export function StickyBookBar() {
  const path = usePathname();
  if (!showsBookBar(path)) return null;
  return (
    <>
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 bg-surface sm:hidden" />
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(15_42_67/0.06)] backdrop-blur sm:hidden">
        <div className="flex gap-2">
          <a href={`tel:${SITE.phoneTel}`} className="btn-outline flex-1" aria-label={`Call ${SITE.phoneDisplay}`}>
            <Phone className="size-4" aria-hidden /> Call
          </a>
          <Link href="/book" className="btn-primary flex-[2]">
            <CalendarCheck className="size-4" aria-hidden /> Book now
          </Link>
        </div>
      </div>
    </>
  );
}
