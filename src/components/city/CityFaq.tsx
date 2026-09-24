import type { City } from "@/lib/cities";
import { buildFaqs } from "@/lib/city-faq";
import { serializeJsonLd } from "@/lib/json-ld";
import { Disclosure } from "@/components/ui/Disclosure";
import { buildFaqJsonLd, SPEAKABLE_JSON_LD } from "@/app/cities/[slug]/city-data";

interface CityFaqProps {
  city: City;
  intro: string | null;
  climateComfort: string | null;
}

/** Visible FAQ + matching FAQPage / Speakable JSON-LD (SEO Phase 2.2). */
export function CityFaq({ city, intro, climateComfort }: CityFaqProps) {
  const faqs = buildFaqs(city, intro, climateComfort);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(SPEAKABLE_JSON_LD) }}
      />
      <p id="city-faq-summary" className="text-ink-muted max-w-2xl">
        Quick answers about visiting {city.city}, {city.country}, drawn from cached briefings and
        live conditions.
      </p>
      <div className="border-rule mt-4 border-t">
        {faqs.map((faq) => (
          <Disclosure key={faq.q} summary={faq.q}>
            <p className="max-w-2xl">{faq.a}</p>
          </Disclosure>
        ))}
      </div>
    </>
  );
}
