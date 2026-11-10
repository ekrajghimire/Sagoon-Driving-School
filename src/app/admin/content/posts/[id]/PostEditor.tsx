"use client";
import { useMemo, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { savePost, deletePost } from "../../../actions/content";
import { ActionForm } from "../../../_components/ActionForm";
import { SubmitButton } from "../../../_components/SubmitButton";

type Post = { id: string; title: string; slug: string; excerpt: string; category: string; readMins: number; content: string; published: boolean };

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function PostEditor({ post, categories }: { post: Post | null; categories: string[] }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "## Heading\n\nWrite your tip here. Use **bold**, lists:\n\n- point one\n- point two\n\n> Always check current rules with [Service NSW](https://www.service.nsw.gov.au).");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <>
      <ActionForm action={savePost} className="space-y-4">
        {post && <input type="hidden" name="id" value={post.id} />}
        <div className="card grid gap-3 sm:grid-cols-4">
          <label className="label sm:col-span-4">Title
            <input name="title" required value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className="input mt-1" />
          </label>
          <label className="label sm:col-span-2">URL slug
            <input name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className="input mt-1" />
            <span className="help block font-normal">/resources/{slugify(slug || title) || "…"}</span>
          </label>
          <label className="label">Category
            <input name="category" required list="post-cats" defaultValue={post?.category ?? "Getting started"} className="input mt-1" />
            <datalist id="post-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="label">Read time (min)<input name="readMins" type="number" min={1} max={60} defaultValue={post?.readMins ?? 4} className="input mt-1" /></label>
          <label className="label sm:col-span-4">Excerpt (shown in lists & Google)<textarea name="excerpt" rows={2} required defaultValue={post?.excerpt} className="input mt-1" /></label>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-line p-0.5 lg:hidden" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")} className="rounded-lg px-3 py-1.5 text-sm font-semibold aria-selected:bg-brand-700 aria-selected:text-white">Write</button>
              <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")} className="rounded-lg px-3 py-1.5 text-sm font-semibold aria-selected:bg-brand-700 aria-selected:text-white">Preview</button>
            </div>
            <p className="text-xs text-muted">Markdown: ## heading, **bold**, *italic*, - list, 1. list, [link](https://…), &gt; note</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={tab === "write" ? "" : "hidden lg:block"}>
              <label htmlFor="content" className="sr-only">Content (Markdown)</label>
              <textarea id="content" name="content" rows={22} value={content} onChange={(e) => setContent(e.target.value)} className="input font-mono text-sm" />
            </div>
            <div className={`${tab === "preview" ? "" : "hidden lg:block"} max-h-[34rem] overflow-y-auto rounded-xl border border-line p-4`} aria-label="Preview">
              <h1 className="text-2xl font-extrabold">{title || "Untitled"}</h1>
              <div className="prose-x" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={post?.published ?? true} /> Published</label>
          <SubmitButton className="btn-brand">{post ? "Save post" : "Create post"}</SubmitButton>
          {post?.published && <a href={`/resources/${post.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">View live ↗</a>}
        </div>
      </ActionForm>
      {post && (
        <ActionForm action={deletePost} className="mt-6 border-t border-line pt-4">
          <input type="hidden" name="id" value={post.id} />
          <SubmitButton className="btn-danger btn-sm" confirm="Permanently delete this post?">Delete post</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
