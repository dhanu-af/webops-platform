import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import authConfig from "@/lib/auth.config";
import { normalizeLoginId } from "@/lib/login-id";
import { afterFailedLogin, DUMMY_PASSWORD_HASH, isLocked } from "@/lib/login-throttle";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { loginId: {}, password: {} },
      authorize: async (credentials) => {
        const loginId = credentials?.loginId as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!loginId || !password) return null;

        // Staff sign in with their User ID. An entry containing "@" still matches the
        // email on file so accounts that pre-date User IDs keep working.
        const entered = normalizeLoginId(loginId);

        const user = await db.user.findUnique({
          where: entered.includes("@") ? { email: entered } : { loginId: entered },
          include: { assignedAreas: { select: { id: true, sectionId: true, section: { select: { facilityId: true } } } } },
        });
        // Unknown, inactive or locked: still do a bcrypt comparison so the response time does not reveal which User IDs exist.
        if (!user || !user.active || isLocked(user.lockedUntil)) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await db.user.update({ where: { id: user.id }, data: afterFailedLogin(user.failedLogins) });
          return null;
        }
        if (user.failedLogins > 0 || user.lockedUntil) {
          await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
        }

        await logAudit({ entityType: "User", entityId: user.id, action: "LOGIN", userId: user.id });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          areaIds: user.assignedAreas.map((a) => a.id),
          sectionIds: [...new Set(user.assignedAreas.map((a) => a.sectionId))],
          facilityId: user.assignedAreas[0]?.section.facilityId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.areaIds = user.areaIds;
        token.sectionIds = user.sectionIds;
        token.facilityId = user.facilityId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.areaIds = token.areaIds;
      session.user.sectionIds = token.sectionIds;
      session.user.facilityId = token.facilityId;
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {}
      return baseUrl;
    },
  },
});
