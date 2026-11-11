# Launch checklist — things you must configure

Tick each item before telling customers about the site.

## Accounts & keys (all free)
- [ ] Neon database created (Sydney region); `DATABASE_URL` + `DIRECT_URL` set on host
- [ ] `BETTER_AUTH_SECRET` set to a new random value (`openssl rand -base64 32`)
- [ ] Live site address correct: confirmation email links open your real domain, not `localhost` (automatic on Vercel; optionally pin it with `NEXT_PUBLIC_SITE_URL`)
- [ ] `OWNER_EMAIL` set; you've registered with it and unlocked `/admin` (setup code = your `CRON_SECRET`, or via "Continue with Google")
- [ ] Admin → Users & roles shows only people you expect as Owner/Staff
- [ ] Google Calendar: API enabled, service account created, calendar shared with "Make changes to events", 3 `GOOGLE_*` calendar variables set
- [ ] Test: make a booking, see it appear in Google Calendar; add a Busy event, see that time disappear from `/book`
- [ ] Gmail App Password created; `SMTP_*`, `EMAIL_FROM` set; test booking confirmation arrives (check spam)
- [ ] (Optional) Google login OAuth client; redirect URI `https://YOUR-DOMAIN/api/auth/callback/google`
- [ ] `CRON_SECRET` set on Vercel; cron-job.org calls `/api/cron` every 15 min with header `Authorization: Bearer <CRON_SECRET>` and its test run shows 200 OK
- [ ] (Optional) `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_FB_PIXEL_ID`

## Hosting & domain
- [ ] Hosting plan allows commercial use (Vercel Hobby does **not**; use Vercel Pro or Netlify free; check current terms)
- [ ] Domain purchased and connected; HTTPS working
- [ ] Sitemap submitted in Google Search Console (`/sitemap.xml`)
- [ ] Google Business Profile created and verified; reviews link copied into Admin → Settings

## Business details (Admin → Settings)
- [ ] Real **ABN**; GST registered yes/no (if not registered, invoices say "Invoice" and show no GST)
- [ ] Business email, address/area, PayID, payment instructions
- [ ] Instructor name, photo, **real bio**, **NSW driving instructor licence number**, languages
- [ ] Vehicle make/model, photo and features
- [ ] Suburbs you serve
- [ ] Pass rate / students taught: **only real figures**, or leave blank (blank = hidden)

## Prices & availability (Admin → Pricing / Availability)
- [ ] Replace placeholder prices ($75 / $110 / $145 / packages) with yours
- [ ] Check package contents, "Most popular" badges and promo codes (STUDENT10, PENSIONER10, FRIEND15)
- [ ] Working hours, travel buffer (default 15 min), minimum notice (12h), booking window (60 days), cancellation window (24h)
- [ ] Public holidays: seeded list for Dec 2026 – Dec 2027. Verify at nsw.gov.au and add future years

## Content
- [ ] **Testimonials:** the seeded ones are SAMPLES and unpublished. Add real reviews only (fake reviews breach Australian Consumer Law)
- [ ] Replace placeholder photos (instructor, car); see notes in the page files
- [ ] Read every Learner tips article. NSW rules change, so check the facts against Service NSW / Transport for NSW
- [ ] FAQ answers match your policies
- [ ] Opening hours in `src/lib/site.ts` (`hoursText`) match your Admin working hours

## Legal (get professional advice)
- [ ] Privacy Policy reviewed (Australian Privacy Act 1988 / APPs), contact details filled in
- [ ] Terms & Conditions reviewed (Australian Consumer Law: don't exclude consumer guarantees)
- [ ] Cancellation/refund policy matches what you actually do
- [ ] Gift voucher terms: at least 3 years' expiry (ACL requirement)
- [ ] Your instructor licence, business insurance and dual-control car insurance are current

## Final test (on the live site, on your phone)
- [ ] Book as a guest → confirmation email + calendar event → reschedule → cancel
- [ ] Register → buy a package → book with a credit → see invoice
- [ ] Admin: mark lesson complete, add notes and skill ratings → visible in student's Progress tab
- [ ] Contact form email arrives; WhatsApp and call buttons work
- [ ] Run Lighthouse in Chrome DevTools on Home and Pricing (aim 90+)
