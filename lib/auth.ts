import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import authConfig from "@/lib/auth.config";
import { normalizeLoginId } from "@/lib/login-id";
import { afterFailedLogin, DUMMY_PASSWORD_HASH, isLocked } from "@/lib/login-throttle";
import { PHONE_DEVICE, verifyKioskTicket } from "@/lib/kiosk-token";
import { getCachedKioskAllowAnyPhone } from "@/lib/cached-config";
import { canUsePin } from "@/lib/pin";

const WITH_AREAS = { assignedAreas: { select: { id: true, sectionId: true, section: { select: { facilityId: true } } } } } as const;

function toSessionUser(user: {
  id: string;
  name: string;
  email: string | null;
  role: import("@/app/generated/prisma/client").UserRole;
  assignedAreas: Array<{ id: string; sectionId: string; section: { facilityId: string } }>;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    areaIds: user.assignedAreas.map((a) => a.id),
    sectionIds: [...new Set(user.assignedAreas.map((a) => a.sectionId))],
    facilityId: user.assignedAreas[0]?.section.facilityId ?? null,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Shop-floor PIN sign-in. The PIN itself is checked, with its lockout, by the kiosk action
    // (lib/actions/kiosk.ts), which then mints a 30-second signed ticket. This provider only accepts such a
    // ticket, so a session can only start on a registered device after a correct PIN.
    Credentials({
      id: "pin",
      credentials: { ticket: {} },
      authorize: async (credentials) => {
        const ticket = verifyKioskTicket(String(credentials?.ticket ?? ""));
        if (!ticket) return null;
        const isPhone = ticket.deviceId === PHONE_DEVICE;
        const [device, phonesAllowed, user] = await Promise.all([
          isPhone ? null : db.kioskDevice.findUnique({ where: { id: ticket.deviceId }, select: { id: true, revokedAt: true } }),
          isPhone ? getCachedKioskAllowAnyPhone() : true,
          db.user.findUnique({ where: { id: ticket.userId }, include: WITH_AREAS }),
        ]);
        if (isPhone ? !phonesAllowed : !device || device.revokedAt) return null;
        if (!user || !user.active || !canUsePin(user.role) || !user.pinHash) return null;
        return { ...toSessionUser(user), authMethod: "pin" as const, kioskDeviceId: isPhone ? null : device!.id };
      },
    }),
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
          include: WITH_AREAS,
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

        return toSessionUser(user);
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
        // How this session started, and when: a shop-floor PIN session is short-lived and limited (see lib/session-user.ts).
        token.authMethod = user.authMethod ?? "password";
        token.authAt = Date.now();
        token.kioskDeviceId = user.kioskDeviceId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.areaIds = token.areaIds;
      session.user.sectionIds = token.sectionIds;
      session.user.facilityId = token.facilityId;
      session.user.authMethod = token.authMethod ?? "password";
      session.user.authAt = token.authAt ?? 0;
      session.user.kioskDeviceId = token.kioskDeviceId ?? null;
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
