import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { prisma } from "./db";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
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
  if (!roles.includes(user.role)) redirect("/account");
  return user;
}

export function isOwnerOrAdmin(role: string) {
  return role === "OWNER" || role === "STAFF";
}
