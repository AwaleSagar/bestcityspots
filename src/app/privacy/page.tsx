import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - Best City Spots",
  description:
    "How Best City Spots handles your data: privacy-first analytics, no cookies, no tracking, and GDPR-compliant practices.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground"
    >
      <div
        className="container-gutter mx-auto max-w-3xl px-4 py-12 sm:px-6"
        style={{
          paddingTop:
            "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))",
        }}
      >
        <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="group touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/50 transition-colors duration-100 hover:text-foreground py-2"
          >
            <div className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover:border-purple-500/40 group-hover:bg-purple-500/20">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Return to Explorer
            </span>
          </Link>
        </nav>

        <header className="relative space-y-4 py-6 overflow-visible">
          <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">
            <Shield className="h-4 w-4" />
            Legal
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground md:text-6xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-foreground/40">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </header>

        <div className="mt-8 space-y-10 text-sm leading-relaxed text-foreground/70">
          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Our Commitment
            </h2>
            <p>
              Best City Spots is built with privacy as a core principle. We believe
              travel intelligence should be accessible without compromising your
              personal data. We do not sell, trade, or rent your personal information
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Data We Collect
            </h2>
            <ul className="space-y-3 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Anonymous analytics:</strong>{" "}
                  Aggregated page views, session duration, and device type. No
                  cookies are used. Data is fully anonymized and cannot be traced
                  back to individual users.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Local storage:</strong>{" "}
                  Saved places, notes, and theme preferences are stored in your
                  browser&apos;s local storage. This data never leaves your device.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Geolocation (opt-in):</strong>{" "}
                  If you consent, we use your approximate location to find nearby
                  cities. Location data is processed in-session and never stored on
                  our servers.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Data We Do Not Collect
            </h2>
            <ul className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400/60" />
                No email addresses or personal identifiers
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400/60" />
                No tracking cookies or cross-site tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400/60" />
                No advertising pixels or third-party trackers
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400/60" />
                No payment or financial information
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services, each with their own privacy
              policies:
            </p>
            <ul className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Google Places API</strong> —
                  for location data, ratings, and reviews
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Google Gemini AI</strong> —
                  for generating city briefings (no personal data is sent)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                <span>
                  <strong className="text-foreground/90">Supabase</strong> — for
                  database hosting and content caching
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              GDPR Compliance
            </h2>
            <p>
              If you are located in the European Economic Area (EEA), you have
              rights under the General Data Protection Regulation (GDPR). Since we
              collect only anonymous, aggregated data and store preferences locally
              on your device, there is minimal personal data processing. You can
              clear all locally stored data at any time by clearing your browser
              storage.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Your Rights
            </h2>
            <ul className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                Right to access your data (all stored locally in your browser)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                Right to delete your data (clear browser local storage)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                Right to opt out of geolocation (decline the browser prompt)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight text-foreground/90">
              Contact
            </h2>
            <p>
              For privacy-related questions or concerns, please reach out to us
              at{" "}
              <a
                href="mailto:privacy@bestcityspots.com"
                className="font-semibold text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors"
              >
                privacy@bestcityspots.com
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            <p className="text-xs text-foreground/40">
              This privacy policy may be updated from time to time. We will notify
              users of significant changes by updating the &quot;Last updated&quot; date at the
              top of this page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
