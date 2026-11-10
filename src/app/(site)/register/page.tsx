import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleLoginEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="bg-surface px-4 py-12">
      <AuthForm mode="register" next={next} googleEnabled={googleLoginEnabled} />
    </div>
  );
}
