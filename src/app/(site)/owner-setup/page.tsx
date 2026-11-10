import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireUser, STAFF_ROLES } from "@/lib/session";
import { ownerEmails } from "@/lib/auth";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner setup", robots: { index: false } };

export default async function OwnerSetupPage() {
  const user = await requireUser("/owner-setup");
  if ((STAFF_ROLES as readonly string[]).includes(user.role)) redirect("/admin");
  const isOwnerEmail = ownerEmails.includes(user.email.toLowerCase());

  return (
    <div className="bg-surface px-4 py-12">
      <div className="card mx-auto w-full max-w-md">
        <ShieldCheck className="size-10 text-brand-700" aria-hidden />
        <h1 className="mt-3 text-2xl font-extrabold">Unlock the admin dashboard</h1>
        {isOwnerEmail ? (
          <>
            <p className="mt-2 text-sm text-muted">
              You&apos;re signed in as <strong>{user.email}</strong>, the owner email. To prove it&apos;s really you (anyone can type an email address when signing up), enter your owner setup code once.
            </p>
            <ClaimForm />
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            You&apos;re signed in as <strong>{user.email}</strong>, which isn&apos;t the owner email. Ask the owner to give you access in Admin → Users & roles.
          </p>
        )}
        <p className="mt-6 text-center text-sm"><Link href="/account" className="font-semibold text-brand-700 underline">Back to my account</Link></p>
      </div>
    </div>
  );
}
