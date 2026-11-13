"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getVapidPublicKey, sendPush } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";
import { ALL_STAFF } from "../_lib/roles";

export async function getPushKey() {
  await requireStaff(ALL_STAFF);
  return getVapidPublicKey();
}

const subSchema = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), "Invalid endpoint"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(input: unknown, device: string) {
  const user = await requireStaff(ALL_STAFF);
  const p = subSchema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "This browser sent an invalid subscription." };
  const { endpoint, keys } = p.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, device: device.slice(0, 60) },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, device: device.slice(0, 60) },
  });
  revalidatePath("/admin/app");
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const user = await requireStaff(ALL_STAFF);
  await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId: user.id } });
  revalidatePath("/admin/app");
  return { ok: true as const };
}

export async function removePushDevice(fd: FormData) {
  const user = await requireStaff(ALL_STAFF);
  await prisma.pushSubscription.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/admin/app");
}

/** Sends a test alert to all of this person's devices. */
export async function sendTestPush() {
  const user = await requireStaff(ALL_STAFF);
  if (!(await rateLimit("push-test", 10, 600))) return { ok: false as const, error: "Too many tests — wait a few minutes." };
  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
  if (!subs.length) return { ok: false as const, error: "Alerts aren't turned on for any of your devices yet." };
  const r = await sendPush(subs, {
    title: "🔔 Test alert — Sagoon Admin",
    body: "This is how new bookings will appear on this device.",
    url: "/admin/app",
    tag: "test",
  });
  revalidatePath("/admin/app");
  return r.sent ? { ok: true as const, sent: r.sent } : { ok: false as const, error: "Couldn't deliver the alert. Try turning alerts off and on again on this device." };
}
