# Setup & deployment guide (all free tiers)

Plan for about 60–90 minutes. You need a Google account (Gmail is fine) and a GitHub account.

> **Costs:** every service below has a free tier that comfortably covers a one-instructor school. The only thing you'll pay for is your **domain name** (about A$15–30/year for `.com.au`).

---

## 1. Put the code on GitHub

1. Create a **private** repository on github.com (e.g. `sagoon-driving-school`).
2. In this folder:
   ```bash
   git add -A
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/sagoon-driving-school.git
   git push -u origin main
   ```

## 2. Database — Neon (free Postgres)

1. Sign up at **neon.tech**, create a project, region **AWS Asia Pacific (Sydney)**.
2. On the dashboard, copy two connection strings:
   - **Pooled** (host contains `-pooler`): this is `DATABASE_URL`
   - **Direct** (no `-pooler`): this is `DIRECT_URL`
3. Locally, put both in `.env` and run:
   ```bash
   npx prisma migrate deploy   # creates tables + the no-double-booking constraint
   npm run db:seed             # sample prices, packages, hours, holidays, articles, FAQs
   ```

## 3. Google Calendar sync (free)

This lets the website **write every booking into your Google Calendar** and **treat anything busy in your calendar as unavailable**.

1. Go to **console.cloud.google.com**, then create a project (e.g. "Sagoon website").
2. **APIs & Services → Library**: search **Google Calendar API**, then click **Enable**.
3. **IAM & Admin → Service Accounts → Create service account** (name: `sagoon-calendar`). Skip the optional roles.
4. Open the service account, then **Keys → Add key → Create new key → JSON**. A file downloads. Keep it private.
5. Open **calendar.google.com** on a computer. Under **Settings**, open your calendar (or create a dedicated "Driving lessons" calendar), then **Share with specific people → Add people**. Paste the service account email (`…@…iam.gserviceaccount.com`) and choose **"Make changes to events"**.
6. In the same settings page, copy the **Calendar ID** (for your main calendar it's your Gmail address).
7. Set these environment variables:
   - `GOOGLE_CALENDAR_ID`: the Calendar ID
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY`: `private_key` from the JSON, pasted **in double quotes with the `\n` kept**

**How it behaves**
- New booking: creates an event "🚗 Name — Lesson" with the pickup address, phone and booking ref.
- Reschedule: moves the event. Cancel: deletes the event.
- Any **Busy** event you add yourself (dentist, day off, all-day "Busy" event) **blocks those times** on the booking page, with the travel buffer added either side. Events set to "Free" are ignored.
- If Google is unreachable when a customer confirms, the booking is refused with a friendly "try again" message. This means a hidden clash can never be booked. Failed event writes are retried by the scheduled job.
- Customers are not added as event guests (service accounts can't invite people). Instead they get a confirmation email with a calendar (.ics) attachment and an "Add to my calendar" button.

## 4. Email — Gmail SMTP (free, about 500/day)

1. Turn on **2-Step Verification** on your Google account.
2. Go to **myaccount.google.com/apppasswords**, create an app password called "Sagoon website", and copy the 16 characters.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`, `EMAIL_FROM="Sagoon Driving School <you@gmail.com>"`, and `OWNER_EMAIL=you@gmail.com` (you'll get a copy of every new booking).

Without SMTP settings, emails are only printed to the server log, which is handy for testing.

> **SMS reminders** need a paid provider (e.g. Twilio, about A$0.08 per SMS), so they are **not** included. The site sends free email reminders 24h and 2h before each lesson, and Google Calendar notifies you on your phone. If you later want SMS, add a provider call next to the email reminder in `src/app/api/cron/route.ts`.

## 5. Login with Google (optional, free)

1. Google Cloud Console → **APIs & Services → OAuth consent screen**: External, app name "Sagoon Driving School", add your support email. **Publish** it.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorised JavaScript origin: `https://YOUR-DOMAIN`
   - Authorised redirect URI: `https://YOUR-DOMAIN/api/auth/callback/google` (add `http://localhost:3000/api/auth/callback/google` for local testing)
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The "Continue with Google" button appears automatically.

## 6. Hosting

The app is a standard Next.js app and runs on any Node host.

### Option A — Vercel (the original request)
1. **vercel.com → Add New → Project**, import the GitHub repo.
2. Build command: `npm run vercel-build` (runs migrations, then builds).
3. Add all environment variables from `.env.example` (Production and Preview).
4. Deploy. Then **Settings → Domains** to add your domain.

> ⚠️ Vercel's free **Hobby** plan is for **non-commercial, personal use**. A driving school is a business, so for the live site either upgrade to Vercel Pro (US$20/month) or use Option B. Hobby is fine for testing and previews.

### Option B — Netlify (free plan, commercial use; check their current terms)
1. **app.netlify.com → Add new site → Import from Git**, pick the repo. Netlify detects Next.js automatically.
2. Build command: `npx prisma migrate deploy && npm run build`.
3. Add the same environment variables. Deploy, then add your domain.

Whichever host you use, set `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` to your final `https://` domain and redeploy.

## 7. Scheduled jobs (reminders) — GitHub Actions (free)

`/api/cron` sends reminders, marks finished lessons complete, emails review requests and retries calendar syncs. It's triggered every 15 minutes by `.github/workflows/cron.yml`.

1. Pick a long random `CRON_SECRET` (e.g. `openssl rand -hex 32`) and add it to your host's environment variables.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CRON_SECRET`: the same value
   - `SITE_URL`: `https://YOUR-DOMAIN`
3. **Actions** tab → "Scheduled jobs" → **Run workflow** once to test (it should go green).

GitHub may delay scheduled runs by a few minutes at busy times. That's fine for reminders. `vercel.json` also schedules a once-daily backup run on Vercel.

## 8. Create your owner account

1. Make sure `OWNER_EMAIL` is set to your email.
2. Visit `/register` and sign up with that email (or "Continue with Google"). You'll be given the **Owner** role.
3. Open `/admin`. Go through **Settings** (business details, ABN, your bio) and **Availability** (hours, buffer, holidays).

## 9. Domain & SEO

1. Buy a `.com.au` domain (you'll need your ABN) from any registrar, then point it at your host as their instructions say. HTTPS is automatic.
2. **Google Search Console**: add the domain and submit `https://YOUR-DOMAIN/sitemap.xml`.
3. **Google Business Profile**: create or claim "Sagoon Driving School", category *Driving school*, service area Rockdale and nearby suburbs. Copy your "Ask for reviews" link into **Admin → Settings → Google reviews URL**.

## 10. Updating later

- Change prices, packages, hours, holidays, articles and FAQs in **/admin**, with no code changes.
- Code changes: push to GitHub and the host redeploys automatically. Database changes go in `prisma/migrations` and are applied by the build command.

## Local development reference

```bash
npm install
npx prisma dev                 # free local Postgres (prints a postgres:// URL for DATABASE_URL)
npx prisma migrate deploy
npm run db:seed
npm run dev
npm test                       # unit tests
```
