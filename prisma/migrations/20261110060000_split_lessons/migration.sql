-- Split lessons: several bookings that belong to one lesson share a groupRef.
ALTER TABLE "Booking" ADD COLUMN "groupRef" TEXT;
CREATE INDEX "Booking_groupRef_idx" ON "Booking"("groupRef");

-- Hourly time slots (7:00 AM – 8:00 AM, 8:00 AM – 9:00 AM …) by default.
ALTER TABLE "Settings" ALTER COLUMN "slotIntervalMins" SET DEFAULT 60;
UPDATE "Settings" SET "slotIntervalMins" = 60 WHERE "slotIntervalMins" = 30;
