import type { Metadata } from "next";
import Link from "next/link";
import { Search, ExternalLink, Info, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { OFFICIAL_LINKS } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Learner Driver Tips & Guides (NSW)",
  description: "Free guides for NSW learner drivers: licence pathway, logbook hours, DKT and hazard perception tips, roundabouts, parking, test-day advice and handling nerves.",
  alternates: { canonical: "/resources" },
};

const OFFICIAL = [
  { href: OFFICIAL_LINKS.licencePathway, label: "Learner drivers — NSW Government" },
  { href: OFFICIAL_LINKS.getLearner, label: "Apply for a learner licence — Service NSW" },
  { href: OFFICIAL_LINKS.dkt, label: "Driver Knowledge Test" },
  { href: OFFICIAL_LINKS.hpt, label: "Hazard Perception Test" },
  { href: OFFICIAL_LINKS.logbook, label: "Learner driver log book" },
  { href: OFFICIAL_LINKS.drivingTest, label: "Book a driving test — Service NSW" },
  { href: OFFICIAL_LINKS.roadRules, label: "NSW road rules" },
  { href: OFFICIAL_LINKS.saferDrivers, label: "Safer Drivers Course" },
  { href: OFFICIAL_LINKS.overseas, label: "Moving to NSW from overseas" },
];

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const category = (sp.category ?? "").slice(0, 60);

  const [posts, cats] = await Promise.all([
    prisma.post.findMany({
      where: {
        published: true,
        ...(category ? { category } : {}),
        ...(q
          ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, category: true, readMins: true },
    }),
    prisma.post.groupBy({ by: ["category"], where: { published: true }, _count: true, orderBy: { category: "asc" } }),
  ]);

  const chipHref = (c?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (c) p.set("category", c);
    const s = p.toString();
    return `/resources${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-12 sm:py-16">
        <div className="container-x max-w-3xl">
          <p className="eyebrow">Learner resources</p>
          <h1 className="h1 mt-2">Tips & guides for NSW learner drivers</h1>
          <p className="mt-3 text-lg text-muted">Plain-English guides to help you prepare, practise and pass — written by a driving instructor.</p>
          <form action="/resources" role="search" className="mt-6 flex gap-2">
            <label htmlFor="q" className="sr-only">Search guides</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <input id="q" name="q" defaultValue={q} placeholder="Search e.g. roundabouts, logbook, parking" className="input pl-10" />
            </div>
            {category && <input type="hidden" name="category" value={category} />}
            <button className="btn-brand">Search</button>
          </form>
        </div>
      </section>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_300px]">
        <div>
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            <Link href={chipHref()} aria-current={!category ? "page" : undefined} className="badge bg-surface px-3 py-1.5 text-sm text-ink hover:bg-brand-50 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white">
              All
            </Link>
            {cats.map((c) => (
              <Link key={c.category} href={chipHref(c.category)} aria-current={category === c.category ? "page" : undefined} className="badge bg-surface px-3 py-1.5 text-sm text-ink hover:bg-brand-50 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white">
                {c.category} <span className="ml-1 opacity-70">({c._count})</span>
              </Link>
            ))}
          </nav>

          {q && <p className="mt-4 text-sm text-muted" role="status">{posts.length} result{posts.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;</p>}

          {posts.length ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/resources/${p.slug}`} className="card flex h-full flex-col transition hover:border-brand-500 hover:shadow-md">
                    <span className="badge w-fit bg-brand-50 text-brand-700">{p.category}</span>
                    <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
                    <p className="mt-1 flex-1 text-sm text-muted">{p.excerpt}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" aria-hidden /> {p.readMins} min read</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-xl bg-surface p-6 text-muted">No guides found. Try another search or <Link href="/resources" className="font-semibold text-brand-700 underline">see all guides</Link>.</p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="font-bold">Official NSW information</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {OFFICIAL.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-semibold text-brand-700 hover:underline">
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-bold"><Info className="size-4" aria-hidden /> Please note</p>
            <p className="mt-1">These guides are general information only. Licensing rules and road rules change — always check the latest requirements with Transport for NSW and Service NSW.</p>
          </div>
          <div className="card bg-brand-700 text-white">
            <h2 className="font-bold">Ready to practise?</h2>
            <p className="mt-1 text-sm text-brand-100">Put these tips into action with a calm, patient lesson.</p>
            <Link href="/book" className="btn-primary btn-sm mt-3">Book a lesson</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
