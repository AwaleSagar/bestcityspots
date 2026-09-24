import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, CalendarDays, Laptop, ListOrdered, Scale, Wind } from "lucide-react";
import { listMonthSlugs, monthLabel } from "@/lib/topical-hubs";
import { Section } from "@/components/ui/Section";

interface Intent {
  href: string;
  title: string;
  body: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

function intents(now: Date): Intent[] {
  const month = listMonthSlugs().at(now.getUTCMonth()) ?? "january";
  return [
    {
      href: `/best-cities-to-visit-in/${month}`,
      title: `Where to go in ${monthLabel(month)}`,
      body: "Cities in their comfortable season this month, ranked by climate and air.",
      icon: CalendarDays,
    },
    {
      href: "/best-cities-by-air-quality",
      title: "Cleanest air",
      body: "Ranked by measured PM2.5 — the particles that matter most for health.",
      icon: Wind,
    },
    {
      href: "/best-cities-for-digital-nomads",
      title: "Work remotely",
      body: "Fast connections, livable climate and a safety signal, in one score.",
      icon: Laptop,
    },
    {
      href: "/compare",
      title: "Compare cities",
      body: "Put up to three cities side by side: conditions, metrics and a summary.",
      icon: Scale,
    },
    {
      href: "/resources/top-cities",
      title: "The Top 250",
      body: "The world's largest cities, re-ranked by the priorities you choose.",
      icon: ListOrdered,
    },
  ];
}

export function StartWithAQuestion() {
  return (
    <Section
      id="start"
      title="Start with a question"
      description="Not sure where yet? Each guide answers one planning question with data you can check."
    >
      <ul className="border-rule bg-rule grid gap-px overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-5">
        {intents(new Date()).map(({ href, title, body, icon: Icon }) => (
          <li key={href} className="bg-surface">
            <Link
              href={href}
              className="group ease-standard hover:bg-paper flex h-full flex-col gap-3 p-5 transition-colors duration-150"
            >
              <Icon aria-hidden className="text-accent size-5" />
              <span className="font-display group-hover:text-accent text-xl leading-snug">
                {title}
              </span>
              <span className="text-ink-muted text-sm">{body}</span>
              <ArrowRight
                aria-hidden
                className="text-ink-subtle ease-standard group-hover:text-accent mt-auto size-4 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
