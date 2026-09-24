import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

const STEPS = [
  {
    title: "Live conditions",
    body: "Current temperature and air quality from OpenWeather, with Open-Meteo as a fallback. Refreshed hourly, and every reading shows its age.",
    source: "OpenWeather · Open-Meteo",
  },
  {
    title: "An AI briefing, labelled",
    body: "A short overview, highlights and seasonal notes written by Google Gemini, cached and dated. A starting point — never the only source.",
    source: "Google Gemini",
  },
  {
    title: "Places people rate",
    body: "Landmarks, food and stays from Google Places, ordered by traveler reviews. Save them, add notes and plan days — all kept on your device.",
    source: "Google Places",
  },
];

export function HowItsBuilt() {
  return (
    <Section
      id="how"
      title="How a guide is built"
      actions={
        <Link href="/methodology" className={buttonClasses({ variant: "link" })}>
          Read the methodology
        </Link>
      }
    >
      <ol className="grid gap-8 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="font-display text-ink-subtle text-4xl leading-none">{index + 1}</span>
            <h3 className="text-h3 mt-3">{step.title}</h3>
            <p className="text-ink-muted mt-2">{step.body}</p>
            <p className="text-ink-muted mt-3 text-xs font-medium">Source: {step.source}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
