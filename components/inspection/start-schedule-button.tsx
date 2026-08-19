"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getOrCreateInspectionForSchedule } from "@/lib/actions/inspections";

export function StartScheduleButton({ scheduleId, label }: { scheduleId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={label === "Start" ? "primary" : "secondary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const id = await getOrCreateInspectionForSchedule(scheduleId);
          router.push(`/inspections/${id}`);
        })
      }
    >
      {pending ? "Opening…" : label}
    </Button>
  );
}
