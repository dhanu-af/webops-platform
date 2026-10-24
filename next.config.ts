import type { NextConfig } from "next";
import pkg from "./package.json";

// HTTPS-only transport (URS-18). Vercel terminates TLS and already redirects
// http -> https; HSTS tells browsers never to try plain HTTP again.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never framed in production. Development allows it so pages can be checked at phone/tablet widths in a sized frame.
  ...(process.env.NODE_ENV === "production" ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Release identity (URS-19): shown in the footer and stamped on every record
  // and signature so a record can be traced to the validated release. The git
  // SHA is set by Vercel at build time; it is blank for local builds.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
  async headers() {
    const staticAsset = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Logos and home-screen icons rarely change: let phones keep them for a day.
      { source: "/icons/:path*", headers: staticAsset },
      { source: "/:file(.*\\.(?:jpg|jpeg|png|svg|webp|ico))", headers: staticAsset },
    ];
  },
};

export default nextConfig;
