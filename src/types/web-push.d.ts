// Minimal types for web-push v4 (ESM, ships without TypeScript types).
declare module "web-push" {
  export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };
  export type VapidDetails = { subject: string; publicKey: string; privateKey: string };
  export type RequestOptions = { TTL?: number; urgency?: "very-low" | "low" | "normal" | "high"; topic?: string; vapidDetails?: VapidDetails };
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
  export function sendNotification(subscription: PushSubscriptionJSON, payload?: string, options?: RequestOptions): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;
  export class WebPushError extends Error {
    statusCode: number;
    body: string;
    endpoint: string;
  }
}
