import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div aria-hidden className="mx-auto grid size-20 place-items-center rounded-2xl border-4 border-ink bg-accent text-4xl font-black text-ink">?</div>
        <h1 className="mt-6 text-3xl font-extrabold">Wrong turn!</h1>
        <p className="mt-3 text-muted">We couldn&apos;t find that page. It may have moved, or the link might be out of date. Let&apos;s get you back on the road.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-outline">Go home</Link>
          <Link href="/book" className="btn-primary">Book a lesson</Link>
        </div>
        <p className="mt-6 text-sm"><Link href="/resources" className="font-semibold text-brand-700 underline">Browse learner tips</Link> · <Link href="/contact" className="font-semibold text-brand-700 underline">Contact us</Link></p>
      </div>
    </main>
  );
}
