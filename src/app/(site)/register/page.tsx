import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { AuthForm } from "@/components/AuthForm";
import { googleLoginEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNext(next));
  return (
    <div className="flex items-start justify-center bg-gradient-to-b from-brand-50 to-surface px-4 py-10 sm:py-16">
      <AuthForm mode="register" next={next} googleEnabled={googleLoginEnabled} />
    </div>
  );
}
