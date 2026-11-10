"use server";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { attempt, str, bool, dollarsToCents, slugify, UserError } from "../_lib/action-utils";
import { ADMINS } from "../_lib/roles";
import type { ActionState } from "../_lib/types";

function touch() {
  revalidatePath("/admin/pricing");
  revalidatePath("/pricing");
  revalidatePath("/book");
  revalidatePath("/");
}

const intIn = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export async function saveLessonType(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(500),
        kind: z.enum(["LESSON", "TEST_PACKAGE", "REFRESHER", "CONFIDENCE"]),
        durationMins: intIn(30, 300),
        sortOrder: intIn(0, 999),
      })
      .parse({ id: str(fd, "id") || undefined, name: str(fd, "name"), description: str(fd, "description"), kind: str(fd, "kind"), durationMins: str(fd, "durationMins"), sortOrder: str(fd, "sortOrder") || "0" });
    const data = { ...d, priceCents: dollarsToCents(str(fd, "price")), popular: bool(fd, "popular"), active: bool(fd, "active") };
    delete (data as { id?: string }).id;
    if (d.id) await prisma.lessonType.update({ where: { id: d.id }, data });
    else await prisma.lessonType.create({ data: { ...data, slug: `${slugify(d.name)}-${randomInt(1000, 9999)}` } });
    touch();
    return d.id ? "Lesson type saved" : "Lesson type created";
  });
}

export async function deleteLessonType(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const id = z.string().min(1).parse(str(fd, "id"));
    const used = await prisma.booking.count({ where: { lessonTypeId: id } });
    if (used) {
      await prisma.lessonType.update({ where: { id }, data: { active: false } });
      touch();
      return `Has ${used} booking(s), so it was deactivated instead of deleted`;
    }
    await prisma.lessonType.delete({ where: { id } });
    touch();
    return "Deleted";
  });
}

export async function savePackage(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(500),
        lessonCount: intIn(1, 100),
        lessonDurationMins: intIn(30, 240),
        sortOrder: intIn(0, 999),
      })
      .parse({
        id: str(fd, "id") || undefined,
        name: str(fd, "name"),
        description: str(fd, "description"),
        lessonCount: str(fd, "lessonCount"),
        lessonDurationMins: str(fd, "lessonDurationMins"),
        sortOrder: str(fd, "sortOrder") || "0",
      });
    const features = str(fd, "features").split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
    const data = {
      name: d.name,
      description: d.description,
      lessonCount: d.lessonCount,
      lessonDurationMins: d.lessonDurationMins,
      sortOrder: d.sortOrder,
      features,
      priceCents: dollarsToCents(str(fd, "price")),
      popular: bool(fd, "popular"),
      active: bool(fd, "active"),
      includesTest: bool(fd, "includesTest"),
    };
    if (d.id) await prisma.package.update({ where: { id: d.id }, data });
    else await prisma.package.create({ data: { ...data, slug: `${slugify(d.name)}-${randomInt(1000, 9999)}` } });
    touch();
    return d.id ? "Package saved" : "Package created";
  });
}

export async function deletePackage(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const id = z.string().min(1).parse(str(fd, "id"));
    const used = await prisma.packagePurchase.count({ where: { packageId: id } });
    if (used) {
      await prisma.package.update({ where: { id }, data: { active: false } });
      touch();
      return `Has ${used} purchase(s), so it was deactivated instead of deleted`;
    }
    await prisma.package.delete({ where: { id } });
    touch();
    return "Deleted";
  });
}

const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const randomCode = (n = 6) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");

export async function createPromo(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const isGift = bool(fd, "isGiftVoucher");
    const kind = z.enum(["PERCENT", "FIXED"]).parse(str(fd, "kind") || "PERCENT");
    const code = (str(fd, "code") || (isGift ? `GIFT-${randomCode()}` : "")).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]{3,30}$/.test(code)) throw new UserError("Code must be 3–30 letters, numbers or dashes.");
    const rawValue = str(fd, "value");
    const value = kind === "PERCENT" ? intIn(1, 100).parse(rawValue) : dollarsToCents(rawValue);
    if (kind === "FIXED" && value < 100) throw new UserError("Fixed discounts must be at least $1.");
    const maxUses = str(fd, "maxUses") ? intIn(1, 100000).parse(str(fd, "maxUses")) : null;
    const expires = str(fd, "expiresAt");
    if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) throw new UserError("Invalid expiry date.");
    await prisma.promoCode.create({
      data: {
        code,
        kind,
        value,
        maxUses,
        isGiftVoucher: isGift,
        description: str(fd, "description").slice(0, 200),
        expiresAt: expires ? new Date(`${expires}T23:59:59+10:00`) : null,
      },
    });
    touch();
    return `Created code ${code}`;
  });
}

export async function generateGiftVoucher(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const value = dollarsToCents(str(fd, "value"));
    if (value < 100) throw new UserError("Enter the voucher value in dollars.");
    const recipient = str(fd, "recipient").slice(0, 100);
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 3);
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = `GIFT-${randomCode()}`;
      if (!(await prisma.promoCode.findUnique({ where: { code } }))) break;
    }
    await prisma.promoCode.create({
      data: { code, kind: "FIXED", value, maxUses: 1, isGiftVoucher: true, expiresAt: expires, description: `Gift voucher${recipient ? ` for ${recipient}` : ""}` },
    });
    touch();
    return `Gift voucher ${code} created (valid 3 years, single use). Give this code to the customer.`;
  });
}

export async function togglePromo(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff(ADMINS);
  return attempt(async () => {
    const id = z.string().min(1).parse(str(fd, "id"));
    const p = await prisma.promoCode.findUnique({ where: { id } });
    if (!p) throw new UserError("Not found.");
    await prisma.promoCode.update({ where: { id }, data: { active: !p.active } });
    touch();
    return p.active ? "Deactivated" : "Reactivated";
  });
}
