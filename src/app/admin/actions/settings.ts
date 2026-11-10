"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, getInstructor } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { attempt, str, bool, lines, UserError } from "../_lib/action-utils";
import { OWNER_ONLY } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

const optUrl = z.union([z.literal(""), z.url().refine((u) => u.startsWith("https://"), "Must start with https://")]);

function touchPublic() {
  for (const p of ["/", "/about", "/contact", "/pricing", "/book", "/reviews", "/admin/settings"]) revalidatePath(p);
}

export async function saveBusiness(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(OWNER_ONLY);
  return attempt(async () => {
    const d = z
      .object({
        businessName: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(8).max(30),
        email: z.email(),
        address: z.string().trim().min(2).max(200),
        abn: z.string().trim().regex(/^[\d ]{11,14}$/, "ABN should be 11 digits"),
        paymentInstructions: z.string().trim().max(500),
        payId: z.string().trim().max(100),
        googleReviewsUrl: optUrl,
        whatsappNumber: z.string().trim().regex(/^\d{8,15}$/, "WhatsApp number: digits only, with country code e.g. 61451634722"),
        statPassRate: z.string().trim().max(20),
        statStudents: z.string().trim().max(20),
        announcement: z.string().trim().max(200),
      })
      .parse(Object.fromEntries(["businessName", "phone", "email", "address", "abn", "paymentInstructions", "payId", "googleReviewsUrl", "whatsappNumber", "statPassRate", "statStudents", "announcement"].map((k) => [k, str(fd, k)])));
    const suburbs = [...new Set(lines(fd, "suburbs"))].slice(0, 100);
    if (!suburbs.length) throw new UserError("Add at least one suburb you service.");
    await prisma.settings.update({ where: { id: 1 }, data: { ...d, suburbs, gstRegistered: bool(fd, "gstRegistered") } });
    touchPublic();
    return "Business details saved";
  });
}

export async function saveInstructor(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(OWNER_ONLY);
  return attempt(async () => {
    const d = z
      .object({ name: z.string().trim().min(2).max(80), bio: z.string().trim().max(3000), accreditation: z.string().trim().max(200), photoUrl: optUrl })
      .parse({ name: str(fd, "name"), bio: str(fd, "bio"), accreditation: str(fd, "accreditation"), photoUrl: str(fd, "photoUrl") });
    const instructor = await getInstructor();
    await prisma.instructor.update({ where: { id: instructor.id }, data: { ...d, photoUrl: d.photoUrl || null, languages: lines(fd, "languages").slice(0, 12) } });
    touchPublic();
    return "Instructor profile saved";
  });
}

export async function saveVehicle(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(OWNER_ONLY);
  return attempt(async () => {
    const d = z.object({ name: z.string().trim().min(2).max(100), photoUrl: optUrl }).parse({ name: str(fd, "name"), photoUrl: str(fd, "photoUrl") });
    const features = str(fd, "features").split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 15);
    const existing = await prisma.vehicle.findFirst({ where: { active: true } });
    const data = { name: d.name, photoUrl: d.photoUrl || null, features, transmission: "Automatic" };
    if (existing) await prisma.vehicle.update({ where: { id: existing.id }, data });
    else await prisma.vehicle.create({ data });
    touchPublic();
    return "Vehicle saved";
  });
}
