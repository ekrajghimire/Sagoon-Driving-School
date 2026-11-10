import { prisma, getSettings } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { todaySydney } from "@/lib/time";
import { ADMINS } from "../../_lib/roles";
import { PageHeader } from "../../_components/PageHeader";
import { creditSummary } from "../../_lib/credits";
import { ManualBookingForm } from "./ManualBookingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New booking" };

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  await requireStaff(ADMINS);
  const sp = await searchParams;
  const customerId = typeof sp.customer === "string" && sp.customer.length <= 64 ? sp.customer : null;
  const [lessonTypes, settings, preset] = await Promise.all([
    prisma.lessonType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    customerId
      ? prisma.user.findUnique({
          where: { id: customerId },
          include: {
            purchases: { where: { status: { in: ["PAID", "PENDING_PAYMENT"] } }, include: { package: { select: { lessonDurationMins: true } } }, orderBy: { createdAt: "asc" } },
            addresses: { take: 1 },
            bookings: { orderBy: { startsAt: "desc" }, take: 1, select: { pickupAddress: true, pickupSuburb: true } },
          },
        })
      : null,
  ]);
  // Prefill from "Book for customer" on a customer page: their details, credits and last pickup address.
  const initialCustomer = preset
    ? {
        id: preset.id,
        name: preset.name,
        email: preset.email,
        phone: preset.phone ?? "",
        ...creditSummary(preset.purchases),
        pickupAddress: preset.bookings[0]?.pickupAddress ?? preset.addresses[0]?.address ?? "",
        pickupSuburb: preset.bookings[0]?.pickupSuburb ?? preset.addresses[0]?.suburb ?? "",
      }
    : null;

  return (
    <>
      <PageHeader
        title="New booking"
        subtitle="For phone, walk-in or WhatsApp customers. It goes straight into the system and Google Calendar, and can never double-book."
        back={preset ? { href: `/admin/customers/${preset.id}`, label: preset.name } : { href: "/admin/bookings", label: "Bookings" }}
      />
      <ManualBookingForm
        lessonTypes={lessonTypes.map((l) => ({ id: l.id, name: l.name, durationMins: l.durationMins, priceCents: l.priceCents }))}
        suburbs={settings.suburbs}
        maxAdvanceDays={Math.max(settings.maxAdvanceDays, 180)}
        today={todaySydney()}
        initialCustomer={initialCustomer}
      />
    </>
  );
}
