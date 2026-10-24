"use client";

import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/app/(app)/account/change-password-form";

export function ForcedChangePasswordForm({ loginId, name }: { loginId: string; name: string }) {
  const router = useRouter();
  return (
    <ChangePasswordForm
      loginId={loginId}
      name={name}
      onSuccess={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
