import "server-only";
import { generateVAPIDKeys, sendNotification } from "web-push";
import { prisma } from "./db";
import { SITE } from "./site";

/**
 * Free phone alerts for staff via standard Web Push (works on Android, desktop browsers, and on
 * iPhone/iPad 16.4+ once the admin is added to the Home Screen). No third-party account needed:
 * the signing keys are generated on first use and stored in the Settings row.
 */

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

async function vapid() {
  let s = await prisma.settings.findUnique({ where: { id: 1 }, select: { vapidPublicKey: true, vapidPrivateKey: true } });
  if (!s?.vapidPublicKey || !s.vapidPrivateKey) {
    const k = generateVAPIDKeys();
    // Only the first concurrent caller wins, so every device uses the same key pair.
    await prisma.settings.updateMany({ where: { id: 1, vapidPublicKey: null }, data: { vapidPublicKey: k.publicKey, vapidPrivateKey: k.privateKey } });
    s = await prisma.settings.findUnique({ where: { id: 1 }, select: { vapidPublicKey: true, vapidPrivateKey: true } });
  }
  if (!s?.vapidPublicKey || !s.vapidPrivateKey) throw new Error("Settings row missing — run the seed first");
  const owner = (process.env.OWNER_EMAIL ?? "").split(",")[0]?.trim();
  const subject = process.env.VAPID_SUBJECT || (SITE.url.startsWith("https://") ? SITE.url : `mailto:${owner || "admin@example.com"}`);
  return { subject, publicKey: s.vapidPublicKey, privateKey: s.vapidPrivateKey };
}

export async function getVapidPublicKey() {
  return (await vapid()).publicKey;
}

/** Send to specific devices. Devices that have been uninstalled/revoked (404/410) are removed. */
export async function sendPush(subs: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: PushPayload) {
  if (!subs.length) return { sent: 0, failed: 0 };
  const vapidDetails = await vapid();
  const body = JSON.stringify({ ...payload, url: payload.url ?? "/admin" });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: "high", vapidDetails });
        sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      } catch (e) {
        failed++;
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("[push] send failed", code, (e as Error).message);
      }
    }),
  );
  return { sent, failed };
}

/** Alert every owner / staff / instructor device. Never throws. */
export async function notifyStaff(payload: PushPayload) {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { user: { role: { in: ["OWNER", "STAFF", "INSTRUCTOR"] } } } });
    return await sendPush(subs, payload);
  } catch (e) {
    console.error("[push] notifyStaff failed", e);
    return { sent: 0, failed: 0 };
  }
}
