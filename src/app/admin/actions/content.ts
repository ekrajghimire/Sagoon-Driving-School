"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { attempt, str, bool, slugify, UserError } from "../_lib/action-utils";
import { ADMINS } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

function touch(extra: string[] = []) {
  for (const p of ["/admin/content", "/", "/resources", "/faq", "/reviews", ...extra]) revalidatePath(p);
}

export async function savePost(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  let createdId: string | null = null;
  const res = await attempt(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        title: z.string().trim().min(3).max(150),
        slug: z.string().trim().max(80),
        excerpt: z.string().trim().min(10, "Excerpt is too short").max(300),
        category: z.string().trim().min(2).max(50),
        readMins: z.coerce.number().int().min(1).max(60),
        content: z.string().min(20, "Content is too short").max(50000),
      })
      .parse({ id: str(fd, "id") || undefined, title: str(fd, "title"), slug: str(fd, "slug"), excerpt: str(fd, "excerpt"), category: str(fd, "category"), readMins: str(fd, "readMins") || "4", content: String(fd.get("content") ?? "") });
    const slug = slugify(d.slug || d.title);
    if (!slug) throw new UserError("Please enter a title.");
    const data = { title: d.title, slug, excerpt: d.excerpt, category: d.category, readMins: d.readMins, content: d.content, published: bool(fd, "published") };
    if (d.id) {
      const old = await prisma.post.findUnique({ where: { id: d.id } });
      await prisma.post.update({ where: { id: d.id }, data: { ...data, ...(data.published && !old?.published ? { publishedAt: new Date() } : {}) } });
      touch([`/resources/${slug}`, ...(old && old.slug !== slug ? [`/resources/${old.slug}`] : [])]);
      return "Post saved";
    }
    const p = await prisma.post.create({ data });
    createdId = p.id;
    touch([`/resources/${slug}`]);
  });
  if (res.ok && createdId) redirect(`/admin/content/posts/${createdId}?created=1`);
  return res;
}

export async function deletePost(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  const res = await attempt(async () => {
    const p = await prisma.post.delete({ where: { id: z.string().min(1).parse(str(fd, "id")) } });
    touch([`/resources/${p.slug}`]);
  });
  if (res.ok) redirect("/admin/content?tab=posts");
  return res;
}

export async function saveFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(5).max(3000),
        category: z.string().trim().min(2).max(50),
        sortOrder: z.coerce.number().int().min(0).max(9999),
      })
      .parse({ id: str(fd, "id") || undefined, question: str(fd, "question"), answer: str(fd, "answer"), category: str(fd, "category") || "General", sortOrder: str(fd, "sortOrder") || "0" });
    const data = { question: d.question, answer: d.answer, category: d.category, sortOrder: d.sortOrder, published: bool(fd, "published") };
    if (d.id) await prisma.faq.update({ where: { id: d.id }, data });
    else await prisma.faq.create({ data });
    touch();
    return d.id ? "FAQ saved" : "FAQ added";
  });
}

export async function deleteFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.faq.delete({ where: { id: z.string().min(1).parse(str(fd, "id")) } });
    touch();
    return "FAQ deleted";
  });
}

export async function saveTestimonial(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(2).max(80),
        suburb: z.string().trim().max(60),
        rating: z.coerce.number().int().min(1).max(5),
        quote: z.string().trim().min(5).max(1000),
      })
      .parse({ id: str(fd, "id") || undefined, name: str(fd, "name"), suburb: str(fd, "suburb"), rating: str(fd, "rating") || "5", quote: str(fd, "quote") });
    const published = bool(fd, "published");
    if (published && /^sample\b/i.test(d.name)) throw new UserError("This looks like a sample testimonial. Replace it with a real student review before publishing.");
    const data = { name: d.name, suburb: d.suburb, rating: d.rating, quote: d.quote, published };
    if (d.id) await prisma.testimonial.update({ where: { id: d.id }, data });
    else await prisma.testimonial.create({ data });
    touch();
    return d.id ? "Testimonial saved" : "Testimonial added";
  });
}

export async function deleteTestimonial(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.testimonial.delete({ where: { id: z.string().min(1).parse(str(fd, "id")) } });
    touch();
    return "Testimonial deleted";
  });
}
