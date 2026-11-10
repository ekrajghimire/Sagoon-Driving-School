import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { SITE, usableUrl } from "./site";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const ownerEmails = (process.env.OWNER_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: usableUrl(process.env.BETTER_AUTH_URL) || SITE.url,
  // Also accept logins on Vercel's own addresses (e.g. *.vercel.app and preview deployments).
  trustedOrigins: [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((h): h is string => Boolean(h))
    .map((h) => `https://${h}`),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: googleEnabled
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      phone: { type: "string", required: false },
      marketingOptIn: { type: "boolean", required: false, defaultValue: false },
      privacyConsentAt: { type: "date", required: false, input: false },
    },
    deleteUser: { enabled: true },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 60, max: 30 },
  databaseHooks: {
    user: {
      create: {
        // The owner role is only given automatically when Google has verified the address
        // ("Continue with Google"). A plain email + password sign-up can't prove who owns the
        // address, so it starts as CUSTOMER and the owner claims access at /owner-setup.
        before: async (user) => {
          const role = user.emailVerified && ownerEmails.includes(user.email.toLowerCase()) ? "OWNER" : "CUSTOMER";
          return { data: { ...user, role, privacyConsentAt: new Date() } };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export const googleLoginEnabled = googleEnabled;
