import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ADMINS } from "../../../_lib/roles";
import { PageHeader } from "../../../_components/PageHeader";
import { PostEditor } from "./PostEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireStaff(ADMINS);
  const { id } = await params;
  const sp = await searchParams;
  const post = id === "new" ? null : await prisma.post.findUnique({ where: { id } });
  if (id !== "new" && !post) notFound();
  const cats = await prisma.post.findMany({ distinct: ["category"], select: { category: true } });
  return (
    <>
      {sp.created && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-ok">✓ Post created.</p>}
      <PageHeader title={post ? "Edit post" : "New post"} back={{ href: "/admin/content?tab=posts", label: "All posts" }} />
      <PostEditor post={post} categories={cats.map((c) => c.category)} />
    </>
  );
}
