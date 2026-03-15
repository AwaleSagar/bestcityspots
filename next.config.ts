import type { NextConfig } from "next";

let supabaseHost = "supabase.co";
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) supabaseHost = new URL(url).hostname;
} catch {
  // fallback: supabase.co matches *.supabase.co subdomains in some setups
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
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
