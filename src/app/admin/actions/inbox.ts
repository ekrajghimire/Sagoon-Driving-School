"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { attempt, str } from "../_lib/action-utils";
import { ADMINS } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

const id = z.string().min(1);

export async function toggleHandled(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const m = await prisma.contactMessage.findUnique({ where: { id: id.parse(str(fd, "id")) } });
    if (!m) return "Already removed";
    await prisma.contactMessage.update({ where: { id: m.id }, data: { handled: !m.handled } });
    revalidatePath("/admin/inbox");
    revalidatePath("/admin");
    return m.handled ? "Marked as new" : "Marked as handled";
  });
}

export async function deleteMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.contactMessage.deleteMany({ where: { id: id.parse(str(fd, "id")) } });
    revalidatePath("/admin/inbox");
    revalidatePath("/admin");
    return "Deleted";
  });
}

export async function deleteWaitlistEntry(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.waitlistEntry.deleteMany({ where: { id: id.parse(str(fd, "id")) } });
    revalidatePath("/admin/inbox");
    revalidatePath("/admin");
    return "Removed from waitlist";
  });
}

export async function deleteSubscriber(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    await prisma.newsletterSubscriber.deleteMany({ where: { id: id.parse(str(fd, "id")) } });
    revalidatePath("/admin/inbox");
    return "Unsubscribed";
  });
}
