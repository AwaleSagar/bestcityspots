"use client";

import dynamic from "next/dynamic";

const GeoConsentBanner = dynamic(
  () => import("./GeoConsentBanner").then((module) => module.GeoConsentBanner),
  { ssr: false }
);

export default function LazyGeoConsentBanner() {
  return <GeoConsentBanner />;
}
