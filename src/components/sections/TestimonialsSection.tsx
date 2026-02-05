import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Finally a city guide that shows real metrics and doesn’t hide the data behind sign-up walls. Used it to narrow down where to move.",
    author: "M.K.",
    context: "Travel planner",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    quote:
      "The AI briefings saved me hours. I got a clear picture of Tokyo and Lisbon before booking—exactly what I needed.",
    author: "J.L.",
    context: "Frequent traveler",
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    quote:
      "Clean, fast, and no pop-ups. Refreshing compared to most travel sites. The about page actually explains how they work.",
    author: "R.S.",
    context: "Digital nomad",
    color: "bg-teal-500/20 text-teal-400",
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
          {testimonials.map(({ quote, author, context, color }) => (
            <li
              key={author}
              className="liquid-glass flex flex-col gap-4 rounded-2xl border border-foreground/5 p-5 sm:p-6 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${color}`}>
                  {author}
                </div>
                <div>
                   <cite className="not-italic text-xs font-semibold text-foreground/70 tracking-tight">
                    {author}
                  </cite>
                  <span className="block text-[10px] text-foreground/40 leading-none">{context}</span>
                </div>
              </div>
              
              <Quote
                className="h-6 w-6 text-foreground/10"
                aria-hidden
              />
              <blockquote className="text-sm leading-relaxed text-foreground/80 italic">
                &ldquo;{quote}&rdquo;
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
