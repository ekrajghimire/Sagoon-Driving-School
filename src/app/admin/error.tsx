"use client";
import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <div className="card mx-auto mt-8 max-w-lg text-center">
      <CircleAlert className="mx-auto size-10 text-danger" aria-hidden />
      <h1 className="mt-3 text-xl font-extrabold">This page couldn&apos;t load</h1>
      <p className="mt-1 text-sm text-muted">Usually a brief connection problem. Your data is safe — try again in a moment.</p>
      {digest && <p className="mt-2 font-mono text-xs text-muted">Ref: {digest}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className="btn-brand">
          Try again
        </button>
        <Link href="/admin" className="btn-outline">
          Go to Today
        </Link>
      </div>
    </div>
  );
}
