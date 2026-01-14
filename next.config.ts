import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // CSP is often complex to get right initially without breaking Next.js hydration.
          // Starting with a basic one or leaving it for a dedicated focus is safer.
          // For now, we omit strict CSP in header config to avoid immediate breakage,
          // but valid architecture controls (Shift Left) help mitigate XSS.
        ],
      },
    ];
  },
};

export default nextConfig;
