import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Finally a city guide that shows real metrics and doesn’t hide the data behind sign-up walls. Used it to narrow down where to move.",
    author: "M.K.",
    context: "Travel planner",
  },
  {
    quote:
      "The AI briefings saved me hours. I got a clear picture of Tokyo and Lisbon before booking—exactly what I needed.",
    author: "J.L.",
    context: "Frequent traveler",
  },
  {
    quote:
      "Clean, fast, and no pop-ups. Refreshing compared to most travel sites. The about page actually explains how they work.",
    author: "R.S.",
    context: "Digital nomad",
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section
      className="border-t border-foreground/5 bg-foreground/[0.02] py-12 sm:py-16"
      aria-labelledby="testimonials-heading"
    >
      <div className="container-gutter mx-auto max-w-4xl px-4 sm:px-6">
        <h2
          id="testimonials-heading"
          className="mb-8 text-center text-sm font-black uppercase tracking-[0.2em] text-foreground/50 sm:mb-10"
        >
          What travelers say
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8" role="list">
          {testimonials.map(({ quote, author, context }) => (
            <li
              key={author}
              className="liquid-glass flex flex-col gap-4 rounded-2xl border border-foreground/5 p-5 sm:p-6"
            >
              <Quote
                className="h-8 w-8 text-purple-400/30"
                aria-hidden
              />
              <blockquote className="text-sm leading-relaxed text-foreground/80">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <footer className="mt-auto text-xs text-foreground/50">
                <cite className="not-italic font-semibold text-foreground/70">
                  {author}
                </cite>
                <span className="block">{context}</span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
