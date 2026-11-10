import "server-only";
import { headers } from "next/headers";

/**
 * Simple fixed-window rate limiter (in memory, per server instance). Free and good enough to stop
 * form spam on a small site. For multi-region scale, swap for Upstash Redis (free tier).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function rateLimit(name: string, limit: number, windowSec: number) {
  const key = `${name}:${await clientIp()}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}
