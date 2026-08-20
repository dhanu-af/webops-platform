"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNotificationEnabled } from "@/lib/actions/settings";
import type { NotificationType } from "@/app/generated/prisma/client";

export function NotificationToggle({ type, label, enabled }: { type: NotificationType; label: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            await setNotificationEnabled(type, next);
            router.refresh();
          });
        }}
        className="size-4 rounded border-border-strong accent-[var(--accent)] disabled:opacity-50"
      />
    </label>
  );
}
