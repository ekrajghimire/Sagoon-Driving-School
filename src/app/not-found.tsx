import Link from "next/link";
import { Home, CalendarCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col bg-gradient-to-b from-brand-50 to-white">
      <div className="container-x py-5">
        <Link href="/" aria-label="Sagoon Driving School home" className="inline-block rounded-lg">
          <Logo />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pt-6 pb-20">
        <div className="max-w-md text-center">
          <div aria-hidden className="mx-auto grid size-20 rotate-[-4deg] place-items-center rounded-2xl border-4 border-ink bg-accent text-4xl font-black text-ink shadow-[4px_4px_0_var(--color-ink)]">
            ?
          </div>
          <p className="eyebrow mt-8">Error 404</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Wrong turn!</h1>
          <p className="mt-3 text-muted">We couldn&apos;t find that page. It may have moved, or the link might be out of date. Let&apos;s get you back on the road.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 min-[400px]:flex-row">
            <Link href="/" className="btn-outline">
              <Home className="size-4" aria-hidden /> Go home
            </Link>
            <Link href="/book" className="btn-primary">
              <CalendarCheck className="size-4" aria-hidden /> Book a lesson
            </Link>
          </div>
          <p className="mt-6 text-sm">
            <Link href="/resources" className="link-underline">Browse learner tips</Link>
            <span aria-hidden className="mx-2 text-muted">·</span>
            <Link href="/contact" className="link-underline">Contact us</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
