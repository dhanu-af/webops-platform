"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(_prevState: { error: string } | null, formData: FormData) {
  const loginId = formData.get("loginId") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";

  try {
    await signIn("credentials", { loginId, password, redirectTo: callbackUrl });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid User ID or password. After several wrong attempts an account is locked for 15 minutes." };
    }
    throw error;
  }
}
