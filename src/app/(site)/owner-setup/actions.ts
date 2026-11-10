"use server";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/session";
import { ownerEmails } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type ClaimState = { error?: string };

/**
 * Owner claims admin access by proving they control the hosting: they enter the setup code,
 * which is the CRON_SECRET value they set in Vercel. Only works for an OWNER_EMAIL account.
 */
export async function claimOwner(_: ClaimState, fd: FormData): Promise<ClaimState> {
  if (!(await rateLimit("owner-claim", 5, 900))) return { error: "Too many attempts. Try again in 15 minutes." };
  const user = await requireUser("/owner-setup");
  if (!ownerEmails.includes(user.email.toLowerCase())) return { error: "This account's email isn't the owner email set in Vercel (OWNER_EMAIL)." };
  const secret = process.env.CRON_SECRET ?? "";
  const code = String(fd.get("code") ?? "").trim();
  if (!secret) return { error: "CRON_SECRET isn't set in Vercel yet. Add it, redeploy, then try again." };
  if (code.length !== secret.length || !timingSafeEqual(Buffer.from(code), Buffer.from(secret))) return { error: "That setup code isn't right." };

  const session = await getSession();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "OWNER", emailVerified: true } }),
    // Sign out every other device on this account, in case someone else had used this email.
    prisma.session.deleteMany({ where: { userId: user.id, ...(session ? { id: { not: session.session.id } } : {}) } }),
  ]);
  redirect("/admin");
}
