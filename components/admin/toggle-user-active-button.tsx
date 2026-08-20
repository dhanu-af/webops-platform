"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setUserActive } from "@/lib/actions/users";

export function ToggleUserActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={active ? "destructive" : "secondary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setUserActive(userId, !active);
          router.refresh();
        })
      }
    >
      {pending ? "Saving…" : active ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
