import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FaqJsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";
import { FaqItem } from "@/components/content/FaqItem";

const slug = (c: string) => c.toLowerCase().replace(/\W+/g, "-");

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
      <p className="mt-3 text-lg text-muted">Can&apos;t find your answer? Call or text <a href={`tel:${SITE.phoneTel}`} className="link-underline whitespace-nowrap">{SITE.phoneDisplay}</a> or <Link href="/contact" className="link-underline">send us a message</Link>.</p>

      {groups.size > 1 && (
        <nav aria-label="FAQ categories" className="mt-6 flex flex-wrap gap-2">
          {[...groups.keys()].map((c) => (
            <a key={c} href={`#${slug(c)}`} className="chip">{c}</a>
          ))}
        </nav>
      )}

      {[...groups.entries()].map(([cat, items]) => (
        <section key={cat} id={slug(cat)} aria-labelledby={`${slug(cat)}-h`} className="mt-10 scroll-mt-24">
          <h2 id={`${slug(cat)}-h`} className="text-xl font-bold">{cat}</h2>
          <div className="mt-3 space-y-3">
            {items.map((f) => (
              <FaqItem key={f.id} question={f.question} answer={f.answer} />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-12 rounded-3xl border border-brand-100 bg-brand-50 p-6 sm:p-8">
        <h2 className="text-lg font-bold">Still have a question?</h2>
        <div className="mt-4 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
          <Link href="/contact" className="btn-brand">Contact us</Link>
          <Link href="/book" className="btn-outline">Book a lesson</Link>
        </div>
      </div>
    </div>
  );
}
