import Link from "next/link";
import { SITE } from "@/lib/site";

/** Mobile-only sticky call-to-action bar. */
export function StickyBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur sm:hidden">
      <div className="flex gap-2">
        <a href={`tel:${SITE.phoneTel}`} className="btn-outline flex-1">
          Call
        </a>
        <Link href="/book" className="btn-primary flex-[2]">
          Book now
        </Link>
      </div>
    </div>
  );
}
