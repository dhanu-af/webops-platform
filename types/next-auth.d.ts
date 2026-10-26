import type { UserRole } from "@/app/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    areaIds: string[];
    sectionIds: string[];
    facilityId: string | null;
    /** "pin" for a shop-floor PIN sign-in; absent for a password sign-in. */
    authMethod?: "password" | "pin";
    kioskDeviceId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
      areaIds: string[];
      sectionIds: string[];
      facilityId: string | null;
      authMethod: "password" | "pin";
      authAt: number;
      kioskDeviceId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    areaIds: string[];
    sectionIds: string[];
    facilityId: string | null;
    authMethod?: "password" | "pin";
    authAt?: number;
    kioskDeviceId?: string | null;
  }
}

// next-auth's own JWT callback signature is typed against @auth/core/jwt
// internally (next-auth/jwt just re-exports it) — augmenting only
// "next-auth/jwt" above doesn't reach that signature, so it's duplicated here.
declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    areaIds: string[];
    sectionIds: string[];
    facilityId: string | null;
    authMethod?: "password" | "pin";
    authAt?: number;
    kioskDeviceId?: string | null;
  }
}
