// Static site constants used by layouts and metadata (safe for static rendering).
// Business values that change often (prices, hours, suburbs) live in the database and are edited in /admin.
export const SITE = {
  name: "Sagoon Driving School",
  shortName: "Sagoon",
  tagline: "Calm, patient automatic driving lessons in Rockdale & St George",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phoneDisplay: "0451 634 722",
  phoneTel: "+61451634722",
  whatsapp: "61451634722",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@sagoondrivingschool.com.au",
  suburb: "Rockdale",
  region: "NSW",
  postcode: "2216",
  geo: { lat: -33.9524, lng: 151.1371 },
  hoursText: ["Mon–Fri 7:00am – 7:00pm", "Sat 8:00am – 4:00pm", "Sun closed"],
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
