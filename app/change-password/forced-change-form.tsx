"use client";

import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/app/(app)/account/change-password-form";

export function ForcedChangePasswordForm() {
  const router = useRouter();
  return (
    <ChangePasswordForm
      onSuccess={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
