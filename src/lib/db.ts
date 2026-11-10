import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One PrismaClient per server process (survives hot-reload in dev).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, suburbs: ["Rockdale"] } });
}

export async function getInstructor() {
  const instructor = await prisma.instructor.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!instructor) throw new Error("No active instructor configured. Run `npm run db:seed` or add one in Admin → Settings.");
  return instructor;
}
