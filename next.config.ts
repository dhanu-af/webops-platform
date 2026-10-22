import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // Release identity (URS-19): shown in the footer and stamped on every record
  // and signature so a record can be traced to the validated release. The git
  // SHA is set by Vercel at build time; it is blank for local builds.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
};

export default nextConfig;
