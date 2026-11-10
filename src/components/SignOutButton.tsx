"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton({ className = "btn-ghost btn-sm" }: { className?: string }) {
  const router = useRouter();
  return (
    <button className={className} onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}>
      Sign out
    </button>
  );
}
