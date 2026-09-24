"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/** Route-level error boundary: keeps the site chrome and offers a retry. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main-content">
      <Container className="py-16 pb-24 sm:py-24">
        <h1 className="text-h1 max-w-2xl">Something went wrong on our side.</h1>
        <p className="text-lede text-ink-muted mt-4 max-w-xl">
          A data source didn&apos;t respond as expected. Trying again usually fixes it.
          {error.digest ? (
            <span className="mt-2 block text-sm">Reference: {error.digest}</span>
          ) : null}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className={buttonClasses()}>
            Go to the home page
          </Link>
        </div>
      </Container>
    </main>
  );
}
