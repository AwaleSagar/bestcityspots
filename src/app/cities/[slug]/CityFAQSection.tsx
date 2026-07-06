import { serializeJsonLd } from "@/lib/json-ld";
import { Suspense } from "react";
import type { City } from "@/lib/cities";
import { readCachedCityInsight } from "@/lib/intelligence";
import { getCityMetrics } from "@/lib/metrics";

interface CityFAQSectionProps {
  city: City;
}

interface FAQItem {
  q: string;
  a: string;
}

/**
 * Build a short, evergreen FAQ block for a city. Answers are sourced
 * deterministically from the cached AI insight + metrics so the surface
 * stays stable between visits and is auditable. We avoid generating new
 * AI prose at request time — that would invalidate the "AI is summary,
 * not source" principle in the methodology.
 *
 * SEO Phase 2.2 (audit 5.5): emits visible FAQ copy + `FAQPage` JSON-LD
 * for rich-result eligibility, and a `SpeakableSpecification` block so the
 * city summary is voice-search-eligible.
 */
export function buildFaqs(city: City, intro: string | null, comfort: string | null): FAQItem[] {
  const cityCountry = `${city.city}, ${city.country}`;
  return [
    {
      q: `What is the best time to visit ${city.city}?`,
      a:
        comfort && comfort.length > 0
          ? `${city.city} currently registers a ${comfort.toLowerCase()} climate band in our cache; the city page weather strip and seasons block above show how that varies through the year.`
          : `Climate suitability for ${city.city} varies by season — check the seasons block on this page for month-by-month guidance.`,
    },
    {
      q: `Is ${city.city} safe for travelers?`,
      a: `${city.city} is a major urban center in ${city.country}. Use the live AQI reading and neighborhood texture above as a starting point, and consult your government's travel advisory for ${city.country} before booking.`,
    },
    {
      q: `What language is spoken in ${city.city}?`,
      a: `The most common language reflects the broader linguistic patterns of ${city.country}. English is widely spoken in tourist areas, but learning a few local greetings goes a long way.`,
    },
    {
      q: `What currency is used in ${city.city}?`,
      a: `${city.city} uses the official currency of ${city.country}. Cards are widely accepted in major venues; carry a small amount of local cash for transit and street food.`,
    },
    {
      q: `Is the tap water in ${city.city} safe to drink?`,
      a: `Tap water safety follows the standards of ${city.country}. When in doubt, use bottled or filtered water — particularly outside well-served tourist neighborhoods.`,
    },
    {
      q: `Do I need a visa to visit ${city.city}?`,
      a: `Visa requirements depend on your nationality and the rules of ${city.country}. Check your destination's official immigration site before booking — entry requirements change frequently.`,
    },
    intro && intro.length > 0
      ? {
          q: `What makes ${city.city} unique?`,
          a: intro,
        }
      : {
          q: `What makes ${city.city} unique?`,
          a: `${cityCountry} blends the cultural fabric of ${city.country} with its own neighborhood pulse — see the AI briefing above for an at-a-glance summary.`,
        },
  ];
}

async function FAQContent({ city }: { city: City }) {
  const [insight, metrics] = await Promise.all([
    readCachedCityInsight(city.id)
      .then((read) => read.insight)
      .catch(() => null),
    getCityMetrics(city).catch(() => null),
  ]);

  const faqs = buildFaqs(city, insight?.intro?.trim() ?? null, metrics?.climate_comfort ?? null);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // SEO Phase 2.2: SpeakableSpecification surfaces the FAQ block to voice
  // assistants. Tied to a stable DOM id so the structured-data target
  // matches the rendered surface.
  const speakableJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#city-faq-summary"],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(speakableJsonLd) }}
      />
      <section className="space-y-6" aria-labelledby="city-faq-heading">
        <h2 id="city-faq-heading" className="labelled-rule">
          Travelers frequently ask
        </h2>
        <p id="city-faq-summary" className="text-muted-strong text-sm leading-relaxed">
          Quick answers about visiting {city.city}, {city.country}, drawn from cached briefings and
          live conditions.
        </p>
        <dl className="space-y-3">
          {faqs.map((f) => (
            <div key={f.q} className="border-line bg-surface/65 rounded-lg border p-4 sm:p-5">
              <dt className="text-foreground text-sm font-semibold sm:text-base">{f.q}</dt>
              <dd className="text-muted mt-2 text-sm leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function FAQFallback() {
  return (
    <section className="space-y-4" aria-labelledby="city-faq-heading-fallback">
      <h2 id="city-faq-heading-fallback" className="labelled-rule">
        Travelers frequently ask
      </h2>
      <div className="bg-muted/15 h-32 animate-pulse rounded-lg" />
    </section>
  );
}

export default function CityFAQSection({ city }: CityFAQSectionProps) {
  return (
    <Suspense fallback={<FAQFallback />}>
      <FAQContent city={city} />
    </Suspense>
  );
}
