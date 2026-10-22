import type { NextAuthConfig } from "next-auth";
import { SESSION_IDLE_SECONDS, SESSION_REFRESH_SECONDS } from "@/lib/session-config";

// Edge-safe config used by middleware.ts (no Prisma — can't run on the Edge runtime).
// The full Node/Prisma-backed config lives in lib/auth.ts.
export default {
  trustHost: true,
  // Sliding inactivity timeout (URS-01): the token expires SESSION_IDLE_SECONDS
  // after the last request, not 30 days after sign-in. Lives here (not only in
  // lib/auth.ts) because middleware.ts re-issues the cookie from this config.
  session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS, updateAge: SESSION_REFRESH_SECONDS },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
