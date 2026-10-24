"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setUserActive } from "@/lib/actions/users";

export function ToggleUserActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
    <Button
      size="sm"
      variant={active ? "destructive" : "secondary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setError(null);
          const result = await setUserActive(userId, !active);
          if (!result.ok) return setError(result.error);
          router.refresh();
        })
      }
    >
      {pending ? "Saving…" : active ? "Deactivate" : "Reactivate"}
    </Button>
    {error && <span className="text-xs text-status-critical">{error}</span>}
    </>
  );
}
