"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/lib/actions/users";

/** Super Admin only. Deletes an account that was never used; one with history is refused and should be deactivated. */
export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete ${name} permanently? This only works for an account that was never used. It cannot be undone.`)) return;
          startTransition(async () => {
            setError(null);
            const result = await deleteUser(userId);
            if (!result.ok) return setError(result.error);
            router.refresh();
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error && <span role="alert" className="basis-full text-xs text-status-critical">{error}</span>}
    </>
  );
}
