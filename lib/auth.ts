import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import authConfig from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { assignedAreas: { select: { id: true, sectionId: true, section: { select: { facilityId: true } } } } },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
