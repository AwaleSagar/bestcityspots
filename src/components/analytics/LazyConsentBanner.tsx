"use client";

import dynamic from "next/dynamic";

/** Consent UI is never needed for first paint — load it after hydration. */
export const LazyConsentBanner = dynamic(
  () => import("./ConsentBanner").then((mod) => mod.ConsentBanner),
  { ssr: false }
);
