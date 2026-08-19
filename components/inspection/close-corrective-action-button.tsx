"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { closeCorrectiveAction } from "@/lib/actions/inspections";

export function CloseCorrectiveActionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="pass"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await closeCorrectiveAction(id);
          router.refresh();
        })
      }
    >
      {pending ? "Closing…" : "Verify & Close"}
    </Button>
  );
}
