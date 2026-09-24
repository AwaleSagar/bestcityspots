import type { NextConfig } from "next";

let supabaseHost = "supabase.co";
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) supabaseHost = new URL(url).hostname;
} catch {
  // fallback: supabase.co matches *.supabase.co subdomains in some setups
}

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    qualities: [75, 85],
    remotePatterns: [
      // Standard Supabase Storage URLs
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase Image Transformation URLs (for WebP/resize on-the-fly)
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/render/image/public/**",
      },
    ],
  },
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
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          // SEO Phase 3.6 (audit 8.5): Content-Security-Policy in
          // Report-Only mode. Emitting the header without enforcement lets
          // us collect violation telemetry from real traffic before
          // promoting the policy to enforced mode. The directive set is
          // intentionally permissive (`'unsafe-inline'` for styles and
          // scripts) because Next.js, next-themes and Tailwind v4 inject
          // inline runtime CSS/JS — a stricter nonce-based policy needs
          // its own focused rollout.
          //
          // Security audit L-3: violations now report to /api/csp-report
          // (both the modern `report-to` group declared in the
          // `Reporting-Endpoints` header below and the legacy `report-uri`,
          // which Safari and older Chrome still use). Without a sink the
          // header neither blocked nor reported anything. `'unsafe-eval'`
          // is also dropped outside development — the production bundle
          // does not need it, and keeping it would mask real violations in
          // the telemetry this policy exists to collect.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "form-action 'self'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "connect-src 'self' https: wss:",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
              "upgrade-insecure-requests",
              "report-uri /api/csp-report",
              "report-to csp-endpoint",
            ].join("; "),
          },
          {
            key: "Reporting-Endpoints",
            value: 'csp-endpoint="/api/csp-report"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
