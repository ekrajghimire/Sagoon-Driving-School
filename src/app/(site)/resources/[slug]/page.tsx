import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info, Clock, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  return prisma.post.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Guide not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/resources/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.publishedAt.toISOString() },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const related = await prisma.post.findMany({
    where: { published: true, slug: { not: post.slug }, category: post.category },
    take: 3,
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, excerpt: true },
  });
  const more =
    related.length < 3
      ? await prisma.post.findMany({
          where: { published: true, slug: { notIn: [post.slug, ...related.map((r) => r.slug)] } },
          take: 3 - related.length,
          orderBy: { publishedAt: "desc" },
          select: { slug: true, title: true, excerpt: true },
        })
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/resources/${post.slug}`,
  };

  return (
    <article className="container-x max-w-3xl py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/resources" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All guides
      </Link>
      <p className="mt-6"><Link href={`/resources?category=${encodeURIComponent(post.category)}`} className="badge bg-brand-50 text-brand-700">{post.category}</Link></p>
      <h1 className="h1 mt-3">{post.title}</h1>
      <p className="mt-3 text-lg text-muted">{post.excerpt}</p>
      <p className="mt-3 flex items-center gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden /> {post.readMins} min read</span>
        <span>Updated {fmtDate(post.updatedAt)}</span>
      </p>

      <div className="prose-x mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

      <aside className="mt-10 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <Info className="size-5 shrink-0" aria-hidden />
        <p>This guide is general information, not legal advice. Rules and requirements change — always confirm the current rules with Transport for NSW or Service NSW before relying on them.</p>
      </aside>

      <div className="mt-10 rounded-2xl bg-brand-700 p-6 text-white sm:p-8">
        <h2 className="text-2xl font-extrabold">Put it into practice</h2>
        <p className="mt-2 text-brand-100">Book a calm, one-on-one lesson in our automatic dual-control car. Free pickup around Rockdale.</p>
        <Link href="/book" className="btn-primary mt-4">Book a lesson</Link>
      </div>

      {[...related, ...more].length > 0 && (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="text-xl font-bold">Keep reading</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {[...related, ...more].map((r) => (
              <li key={r.slug}>
                <Link href={`/resources/${r.slug}`} className="card block h-full p-4 hover:border-brand-500 sm:p-4">
                  <p className="font-bold">{r.title}</p>
                  <p className="mt-1 text-sm text-muted">{r.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
