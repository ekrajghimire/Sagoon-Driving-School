# Admin guide — running Sagoon Driving School

Log in at **/login** with your owner email, then go to **/admin** (or **My account → Admin dashboard**). Everything works on your phone.

## Roles

| Role | Can do |
| --- | --- |
| **Owner** (you) | Everything, including Settings and Users & roles |
| **Staff** (e.g. a receptionist) | Bookings, customers, pricing, availability, content, inbox, reports |
| **Instructor** | Today's schedule, bookings (view, mark complete, notes, skill ratings), own availability |

Anyone whose email is in `OWNER_EMAIL` becomes Owner automatically when they register. Promote other people in **Users** after they create an account.

## Daily routine

1. **Today** (`/admin`): today's and tomorrow's lessons with the student's phone (tap to call), pickup address (tap for Google Maps), notes and payment status.
2. After each lesson, open it and:
   - **Mark paid** and choose the method (cash, card, PayID, bank transfer)
   - **Mark complete**, or **No-show** if they didn't turn up
   - Add **lesson notes** and **skill ratings** (1 = introduced … 5 = test ready). Students see these in their Progress tab.

Lessons still "Confirmed" 6 hours after they end are marked complete automatically, and the student gets a review-request email.

## Bookings

- **Bookings → list or Week view.** Filter by date, status, or search name/phone/ref.
- **Open a booking** to reschedule (pick a new time), cancel (the customer is emailed and any package credit is returned), view the tax invoice, or retry the Google Calendar sync.
- **New booking** (for phone or walk-in customers): choose a lesson type or enter a custom one, pick a time, enter the customer's details. Use **staff override** to book outside normal hours. The system still refuses anything that overlaps another lesson or a busy event in your Google Calendar.

### Google Calendar
- Every booking appears in your Google Calendar automatically (moved or deleted when it changes).
- To block time off, either add a **Busy** event in Google Calendar (fastest from your phone) or use **Availability → Blocked times**. Both hide those times on the website immediately.
- If an event fails to sync, the dashboard shows a warning and a **Retry** button. The scheduled job also retries every 15 minutes.

## Customers

- Search, open a profile, and see their lessons, packages, progress and saved addresses. Edit learner details (licence number, type, test date).
- **Export CSV** downloads all customers (for your records or a mailing tool; only email people who opted in).
- **Packages:** when someone orders a package, credits are available immediately and the order shows **Payment due**. Mark it **Paid** when you receive the money, or **Cancel/Refund** it.

## Pricing & promotions

- **Pricing:** edit names, descriptions, durations and prices (enter dollars incl. GST), set **Most popular**, change the order, or switch an item off. Items with bookings can't be deleted, only deactivated.
- **Packages:** number of lessons, lesson length, price, features (one per line).
- **Promo codes:** percentage or fixed amount, optional max uses and expiry. Seeded: `STUDENT10`, `PENSIONER10`, `FRIEND15` (referrals).
- **Gift vouchers:** click **Generate gift voucher** for a single-use code (e.g. `GIFT-7K2Q9M`) worth a fixed amount, valid 3 years. Send the code to the buyer once they've paid.

## Availability

- **Working hours** for each weekday (you can add split shifts, e.g. 7–11am and 2–7pm).
- **Blocked times:** holidays, appointments, car servicing.
- **Public holidays:** NSW holidays to Dec 2027 are pre-loaded. Add each new year's dates.
- **Rules:** time-slot interval (30 min), **travel buffer** between lessons (15 min), minimum notice (12 h), how far ahead people can book (60 days), and the cancellation window (24 h). Lesson lengths come from each lesson type in **Pricing**.

## Content

- **Posts (Learner tips):** write in simple Markdown with a live preview. `## Heading`, `- list item`, `**bold**`, `[link text](https://…)`, `> note`.
- **FAQs:** add, edit, reorder and hide questions.
- **Testimonials:** add real reviews (with the student's permission) and publish them. The seeded ones are samples and unpublished. Never publish made-up reviews.

## Inbox

Contact form messages (mark handled), waitlist sign-ups (people are emailed automatically when a slot opens on their day), and newsletter subscribers (CSV export).

## Reports

Pick a date range and group by day, week or month to see revenue (paid lessons + paid packages, GST shown), lessons and hours taught, cancellations and no-shows, popular lesson types and packages, and **utilisation** (booked hours ÷ working hours).

## Settings (owner only)

Business name, phone, email, ABN, GST registration, PayID and payment instructions (shown on invoices), Google reviews link, WhatsApp number, real pass-rate and student figures (leave blank to hide), announcement banner, suburbs served, your instructor profile and car details. The status panel shows whether Google Calendar, email, Google login and the scheduler are configured.

## Good habits

- Mark lessons paid on the day, so reports and invoices stay accurate.
- Keep Google Calendar up to date with personal commitments.
- Check **Inbox** daily.
- Every year (about November) add the next year's public holidays and check prices.
