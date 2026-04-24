import Link from "next/link";
import { Container, Row, Stack, Divider } from "@/components/atlas";

const exploreLinks = [
  { href: "/", label: "Explore cities" },
  { href: "/resources/top-cities", label: "Top cities" },
] as const;

const aboutLinks = [
  { href: "/about", label: "About the project" },
  { href: "/about#source-stack", label: "Data sources" },
] as const;

export default function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-[color:var(--color-line)] pb-mobile-nav"
      role="contentinfo"
      aria-label="Site footer"
    >
      <Container size="wide" className="py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <Stack gap={4}>
            <Row gap={2}>
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-accent)]"
              />
              <span className="font-[family-name:var(--font-display)] text-lg font-medium tracking-[-0.01em] text-[color:var(--color-foreground)]">
                Best City Spots
              </span>
            </Row>
            <p className="max-w-sm text-sm leading-[1.6] text-[color:var(--color-muted)]">
              A city research tool with clear search, live urban signals, and
              AI-assisted briefings to help you decide where to go next.
            </p>
          </Stack>

          <Stack gap={3} as="nav" aria-label="Explore">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--color-muted)]">
              Explore
            </h3>
            <ul className="space-y-2" role="list">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[color:var(--color-foreground)] transition-colors hover:text-[color:var(--color-accent-strong)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </Stack>

          <Stack gap={3} as="nav" aria-label="About">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--color-muted)]">
              About
            </h3>
            <ul className="space-y-2" role="list">
              {aboutLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[color:var(--color-foreground)] transition-colors hover:text-[color:var(--color-accent-strong)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </Stack>
        </div>

        <Divider className="my-8" />

        <Row
          justify="between"
          wrap
          gap={2}
          className="text-xs text-[color:var(--color-muted)]"
        >
          <p>&copy; {new Date().getFullYear()} Best City Spots</p>
          <p>City intelligence for deliberate travel</p>
        </Row>
      </Container>
    </footer>
  );
}
