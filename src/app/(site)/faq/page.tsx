import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { FaqJsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about cancellations, rain, driving test bookings, payments, our automatic car, gift vouchers and more.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }] });
  const groups = new Map<string, typeof faqs>();
  for (const f of faqs) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);

  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <FaqJsonLd faqs={faqs} />
      <p className="eyebrow">FAQ</p>
      <h1 className="h1 mt-2">Frequently asked questions</h1>
      <p className="mt-3 text-lg text-muted">Can&apos;t find your answer? Call or text {SITE.phoneDisplay} or <Link href="/contact" className="font-semibold text-brand-700 underline">send us a message</Link>.</p>

      {groups.size > 1 && (
        <nav aria-label="FAQ categories" className="mt-6 flex flex-wrap gap-2">
          {[...groups.keys()].map((c) => (
            <a key={c} href={`#${c.toLowerCase().replace(/\W+/g, "-")}`} className="badge bg-surface px-3 py-1.5 text-sm text-ink hover:bg-brand-50">{c}</a>
          ))}
        </nav>
      )}

      {[...groups.entries()].map(([cat, items]) => (
        <section key={cat} id={cat.toLowerCase().replace(/\W+/g, "-")} className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-bold">{cat}</h2>
          <div className="mt-3 space-y-3">
            {items.map((f) => (
              <details key={f.id} className="group card p-0 sm:p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">
                  {f.question}
                  <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden />
                </summary>
                <p className="whitespace-pre-line px-5 pb-5 text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-12 rounded-2xl bg-brand-50 p-6">
        <h2 className="text-lg font-bold">Still have a question?</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/contact" className="btn-brand">Contact us</Link>
          <Link href="/book" className="btn-outline">Book a lesson</Link>
        </div>
      </div>
    </div>
  );
}
