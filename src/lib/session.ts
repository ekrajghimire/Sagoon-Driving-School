import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { prisma } from "./db";

export const getSession = cache(async () => {
  const h = await headers();
  try {
    return await auth.api.getSession({ headers: h });
  } catch (e) {
    // e.g. BETTER_AUTH_SECRET missing on the host. Treat as logged out so public pages
    // (booking as a guest) keep working; the error still shows in the server logs.
    console.error("[auth] session check failed — is BETTER_AUTH_SECRET set?", e);
    return null;
  }
});

/** Current user row from the database (role is always read from the DB, never trusted from the client). */
export const getCurrentUser = cache(async () => {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.user.id } });
});

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export const STAFF_ROLES = ["OWNER", "STAFF", "INSTRUCTOR"] as const;

export async function requireStaff(roles: readonly string[] = STAFF_ROLES) {
  const user = await requireUser("/admin");
  if (!roles.includes(user.role)) {
    // The owner's own email, not yet confirmed as owner → send them to claim access.
    const owners = (process.env.OWNER_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase());
    redirect(owners.includes(user.email.toLowerCase()) ? "/owner-setup" : "/account");
  }
  return user;
}

export function isOwnerOrAdmin(role: string) {
  return role === "OWNER" || role === "STAFF";
}
