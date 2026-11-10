"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, emails } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";
import { isIsoDate } from "@/lib/time";

export type FormState = { ok?: boolean; error?: string; message?: string };

export async function subscribeNewsletter(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("newsletter", 5, 3600))) return { error: "Too many attempts. Please try later." };
  const parsed = z.object({ email: z.email(), consent: z.literal("on") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please enter a valid email and tick the consent box." };
  await prisma.newsletterSubscriber.upsert({ where: { email: parsed.data.email.toLowerCase() }, update: {}, create: { email: parsed.data.email.toLowerCase() } });
  return { ok: true, message: "Thanks! You're subscribed." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(3000),
  consent: z.literal("on"),
  company: z.string().max(0).optional(), // honeypot
});

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("contact", 5, 3600))) return { error: "Too many messages. Please call us instead." };
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please fill in your name, a valid email, a message, and tick the privacy consent." };
  const { name, email, phone, message } = parsed.data;
  await prisma.contactMessage.create({ data: { name, email, phone: phone || null, message } });
  if (process.env.OWNER_EMAIL) {
    await sendEmail(emails.generic(process.env.OWNER_EMAIL, `Website enquiry from ${name}`, "New enquiry", [`From: ${name} <${email}> ${phone ?? ""}`, message]));
  }
  return { ok: true, message: "Thanks — we'll get back to you within one business day." };
}

const waitlistSchema = z.object({
  date: z.string().refine(isIsoDate),
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().min(8).max(30),
  notes: z.string().max(500).optional(),
});

export async function joinWaitlist(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("waitlist", 10, 3600))) return { error: "Too many attempts." };
  const parsed = waitlistSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please enter your name, email and phone." };
  const user = await getCurrentUser();
  await prisma.waitlistEntry.create({ data: { ...parsed.data, userId: user?.id ?? null } });
  return { ok: true, message: "You're on the waitlist — we'll email you if a spot opens up that day." };
}
