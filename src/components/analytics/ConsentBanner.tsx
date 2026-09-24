"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAnalytics } from "@/lib/useAnalytics";
import { useStoredValue } from "@/hooks/useStoredValue";
import { Button } from "@/components/ui/Button";

const ASKED_KEY = "bcs_geo_asked";
const SHOW_AFTER_MS = 3000;
const parseAsked = (raw: string | null) => raw === "true";
const serializeAsked = (value: boolean) => (value ? "true" : null);

/**
 * Opt-in for coarse location in analytics (country/city derived from the
 * connection, stored only as aggregate counts). Non-modal and never steals
 * focus; asked once per browser.
 */
export function ConsentBanner() {
  const { hasGeoConsent, setGeoConsent } = useAnalytics();
  const [asked, setAsked] = useStoredValue(ASKED_KEY, parseAsked, true, serializeAsked);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || asked || hasGeoConsent) return null;

  const answer = (consent: boolean | null) => {
    if (consent !== null) setGeoConsent(consent);
    setAsked(true);
  };

  return (
    <section
      aria-labelledby="consent-title"
      data-print-hide
      className="border-rule bg-surface shadow-overlay fixed inset-x-3 bottom-3 z-40 rounded-lg border p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="consent-title" className="font-sans text-base font-semibold">
          Help us see where travelers plan from?
        </h2>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => answer(null)}
          className="text-ink-muted hover:bg-sunken -mt-2 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md pointer-coarse:size-11"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <p className="text-ink-muted mt-1.5 text-sm">
        With your OK we count visits by country and city, based on your connection — never your
        precise location, and only as totals.{" "}
        <Link href="/methodology#privacy" className="text-accent underline underline-offset-2">
          How we handle data
        </Link>
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" size="sm" onClick={() => answer(true)}>
          Allow
        </Button>
        <Button variant="ghost" size="sm" onClick={() => answer(false)}>
          No thanks
        </Button>
      </div>
    </section>
  );
}
