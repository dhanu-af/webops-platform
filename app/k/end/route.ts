import type { NextRequest } from "next/server";
import { signOut } from "@/lib/auth";

// A page cannot clear the sign-in cookie while it renders, so the layout sends a session that must end here: a
// deactivated account, a revoked iPad, a changed PIN or an expired shop-floor session. Always safe to open.
export async function GET(request: NextRequest) {
  const toLogin = request.nextUrl.searchParams.get("to") === "login";
  await signOut({ redirectTo: toLogin ? "/login" : "/k?idle=1" });
}
