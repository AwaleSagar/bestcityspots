"use client";

import dynamic from "next/dynamic";

const VisualEffects = dynamic(() => import("@/components/VisualEffects"), {
  ssr: false,
});
const FloralAccent = dynamic(() => import("@/components/FloralAccent"), {
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
