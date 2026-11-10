/**
 * The public address of the site, used in emails, the sitemap, calendar events and login.
 * Works online with no setup on Vercel:
 *   1. NEXT_PUBLIC_SITE_URL, if you set it (e.g. your own domain)
 *   2. otherwise Vercel's production address (your custom domain or *.vercel.app)
 *   3. otherwise the address of a Vercel preview deployment
 *   4. otherwise http://localhost:3000 (only when running on your own computer)
 */
/** A localhost address copied into Vercel by mistake is ignored online. */
export function usableUrl(v?: string) {
  if (!v) return undefined;
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/.test(v)) return undefined;
  return v;
}

function resolveSiteUrl() {
  const withHttps = (host?: string) => (host ? `https://${host.replace(/^https?:\/\//, "")}` : undefined);
  const url =
    usableUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    (process.env.VERCEL_ENV === "preview" ? withHttps(process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL) : undefined) ||
    withHttps(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ||
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    withHttps(process.env.VERCEL_URL) ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

// Static site constants used by layouts and metadata (safe for static rendering).
// Business values that change often (prices, hours, suburbs) live in the database and are edited in /admin.
export const SITE = {
  name: "Sagoon Driving School",
  shortName: "Sagoon",
  tagline: "Calm, patient automatic driving lessons in Rockdale & St George",
  url: resolveSiteUrl(),
  phoneDisplay: "0451 634 722",
  phoneTel: "+61451634722",
  whatsapp: "61451634722",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@sagoondrivingschool.com.au",
  suburb: "Rockdale",
  region: "NSW",
  postcode: "2216",
  geo: { lat: -33.9524, lng: 151.1371 },
  hoursText: ["Mon–Fri 7:00 AM – 7:00 PM", "Sat 8:00 AM – 4:00 PM", "Sun closed"],
  transmission: "Automatic",
} as const;

export const NAV = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Learner tips" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const OFFICIAL_LINKS = {
  licencePathway: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers",
  getLearner: "https://www.service.nsw.gov.au/transaction/apply-for-a-learner-driver-licence",
  dkt: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/driver-licences/driver-knowledge-test",
  hpt: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/driver-licences/hazard-perception-test",
  drivingTest: "https://www.service.nsw.gov.au/transaction/book-a-driving-test",
  roadRules: "https://www.nsw.gov.au/driving-boating-and-transport/roads-safety-and-rules/road-rules",
  logbook: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers/learner-driver-log-book",
  overseas: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/visiting-or-moving-to-nsw/moving-to-nsw-from-overseas",
  saferDrivers: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers/safer-drivers-course",
};
