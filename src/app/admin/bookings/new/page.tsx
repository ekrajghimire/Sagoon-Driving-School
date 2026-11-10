import { prisma, getSettings } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ADMINS } from "../../_lib/roles";
import { PageHeader } from "../../_components/PageHeader";
import { ManualBookingForm } from "./ManualBookingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New booking" };

export default async function NewBookingPage() {
  await requireStaff(ADMINS);
  const [lessonTypes, settings] = await Promise.all([
    prisma.lessonType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="New booking" subtitle="For phone, walk-in or WhatsApp customers. It goes straight into the system and Google Calendar, and can never double-book." />
      <ManualBookingForm
        lessonTypes={lessonTypes.map((l) => ({ id: l.id, name: l.name, durationMins: l.durationMins, priceCents: l.priceCents }))}
        suburbs={settings.suburbs}
        maxAdvanceDays={Math.max(settings.maxAdvanceDays, 180)}
      />
    </>
  );
}
