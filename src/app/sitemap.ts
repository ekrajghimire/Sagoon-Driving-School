import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/book", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/reviews", priority: 0.6, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cancellation-policy", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: `${SITE.url}${s.path}`, changeFrequency: s.changeFrequency, priority: s.priority }));
  try {
    const posts = await prisma.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
    for (const p of posts) entries.push({ url: `${SITE.url}/resources/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly", priority: 0.7 });
  } catch (e) {
    console.error("[sitemap] could not load posts", e);
  }
  return entries;
}
