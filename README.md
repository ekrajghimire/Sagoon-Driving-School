# Sagoon Driving School — website, booking system & admin

A website for **Sagoon Driving School** (Rockdale, Sydney NSW) where learners can compare prices, read NSW learner guides and **book automatic driving lessons online**, with an admin dashboard for the owner/instructor. It is built to run on **free tiers only**.

| Area | What it does |
| --- | --- |
| Public site | Home, Pricing & packages (with a lesson estimator), Learner tips (blog with search), About, Reviews, FAQ, Contact (map, WhatsApp, click-to-call), legal pages, cookie notice |
| Booking | Lesson → date → time → details → confirm. Live availability, guest or logged-in booking, package credits, promo codes and gift vouchers, waitlist, pay on the day |
| No double bookings | Postgres advisory lock + database **exclusion constraint** + re-check of every slot at booking time |
| Google Calendar | Every booking is written to the owner's Google Calendar; busy events you add in Google Calendar block those times on the site |
| Customer account | Upcoming and past lessons, reschedule or cancel (24h window), package balance, tax invoices, saved addresses, learner details, skills progress, account deletion |
| Admin / instructor | Today's schedule with map links, calendar view, manual phone bookings, mark paid or complete, notes and skill ratings, customers + CSV export, prices, packages, promos, availability, holidays, content, reports, roles |
| Notifications | Confirmation email (.ics attached), 24h and 2h reminders, cancel/reschedule notices, review requests, waitlist alerts — all via free SMTP |

## Architecture

```
Next.js 16 (App Router, React 19, TypeScript) ─ Tailwind CSS 4
│
├─ src/app/(site)/…        public pages, /book, /booking/[token], /account/*
├─ src/app/admin/…         admin dashboard + instructor portal (role-gated)
├─ src/app/api/
│   ├─ availability/       GET open slots (per day / per month)
│   ├─ auth/[...all]       Better Auth (email+password, Google)
│   ├─ cron                reminders, auto-complete, review requests, calendar retries
│   └─ ics/[token]         "add to calendar" download
├─ src/lib/
│   ├─ availability.ts     pure slot engine (unit-tested, DST-safe)
│   ├─ booking-service.ts  create / cancel / reschedule with locking + calendar sync
│   ├─ google-calendar.ts  Google Calendar API via service account
│   ├─ email.ts            SMTP (nodemailer) templates
│   ├─ auth.ts, session.ts Better Auth config, role checks
│   └─ time.ts             Australia/Sydney helpers (date-fns-tz)
└─ prisma/                 schema, migrations (incl. exclusion constraint), seed data
```

**Free stack:** Neon Postgres (free tier) · Prisma 7 · Better Auth · Google Calendar API · Gmail SMTP · Vercel or Netlify (free tier) · GitHub Actions (free scheduler for reminders).

### How double-booking is prevented

1. **Availability engine** (`src/lib/availability.ts`) only offers start times inside working hours, outside public holidays and blocked time, with a travel buffer (default 15 min) around every lesson and every busy Google Calendar event.
2. **At confirm time**, the server reads Google Calendar, takes a Postgres advisory lock (all booking writes queue one at a time), and recomputes the slot list before inserting.
3. **Database guarantee:** the `Booking_no_overlap` exclusion constraint (`btree_gist`) makes it impossible for two active bookings to overlap, even if application code had a bug.

### Data model (summary)

`User` (role: OWNER / STAFF / INSTRUCTOR / CUSTOMER, learner details) · `Instructor` (1) + `WorkingHours` · `Vehicle` (1, automatic) · `LessonType` (single lessons, test package, refresher, confidence) · `Package` → `PackagePurchase` (credits) · `Booking` (times in UTC, status, payment, Google event id, reminder flags) · `SkillRating` · `PromoCode` (discounts and gift vouchers) · `BlockedTime` · `PublicHoliday` · `WaitlistEntry` · `SavedAddress` · `Post` / `Faq` / `Testimonial` · `ContactMessage` · `NewsletterSubscriber` · `Settings` (single row of editable business settings). See `prisma/schema.prisma`.

## Quick start (local)

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL at minimum
npx prisma migrate deploy
npm run db:seed
npm run dev                   # http://localhost:3000
```

No Postgres installed? `npx prisma dev` starts a free local Postgres; copy its `postgres://…` URL into `DATABASE_URL`. It's fine for clicking around, but it handles only one connection at a time, so for realistic testing use a free Neon "dev" branch.

Register with the email in `OWNER_EMAIL` to get the owner role, then open `/admin`.

```bash
npm test            # availability engine unit tests (incl. daylight saving)
npm run test:race   # 6 simultaneous bookings → exactly 1 succeeds (needs a real Postgres DEV database)
npm run typecheck
npm run build
```

## Documentation

- [Setup & deployment guide](docs/SETUP_AND_DEPLOYMENT.md)
- [Admin guide](docs/ADMIN_GUIDE.md)
- [Customer guide](docs/CUSTOMER_GUIDE.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)
