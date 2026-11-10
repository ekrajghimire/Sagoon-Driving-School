import { SITE } from "@/lib/site";

/** schema.org DrivingSchool (a LocalBusiness subtype) for local SEO. */
export function BusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "DrivingSchool",
    name: SITE.name,
    url: SITE.url,
    telephone: SITE.phoneTel,
    email: SITE.email,
    image: `${SITE.url}/opengraph-image`,
    priceRange: "$$",
    address: { "@type": "PostalAddress", addressLocality: SITE.suburb, addressRegion: SITE.region, postalCode: SITE.postcode, addressCountry: "AU" },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    areaServed: ["Rockdale", "Kogarah", "Arncliffe", "Bexley", "Brighton-Le-Sands", "Banksia", "Wolli Creek", "Carlton"].map((name) => ({ "@type": "Place", name: `${name} NSW` })),
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "19:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "16:00" },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
