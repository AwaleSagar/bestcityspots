import { serializeJsonLd } from "@/lib/json-ld";
import { Suspense } from "react";
import type { City } from "@/lib/cities";
import { readCachedCityInsight } from "@/lib/intelligence";
import { getCityMetrics } from "@/lib/metrics";
import { buildFaqs } from "@/lib/city-faq";

interface CityFAQSectionProps {
  city: City;
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
