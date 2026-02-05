"use client";

import dynamic from "next/dynamic";

const VisualEffects = dynamic(() => import("@/components/effects/VisualEffects"), {
  ssr: false,
});
const FloralAccent = dynamic(() => import("@/components/effects/FloralAccent"), {
  ssr: false,
});

export default function ClientEffects() {
  return (
    <>
      <VisualEffects />
      <FloralAccent />
    </>
  );
}
