"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNotificationRecipient, removeNotificationRecipient } from "@/lib/actions/settings";
import type { NotificationType } from "@/app/generated/prisma/client";

type Person = { id: string; name: string };

export function NotificationRecipients({
  type,
  recipients,
  candidates,
}: {
  type: NotificationType;
  recipients: Person[];
  candidates: Person[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const available = candidates.filter((c) => !recipients.some((r) => r.id === c.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {recipients.map((r) => (
        <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-muted-strong">
          {r.name}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeNotificationRecipient(type, r.id);
                router.refresh();
              })
            }
            className="text-muted hover:text-status-critical disabled:opacity-50"
            aria-label={`Remove ${r.name}`}
          >
            ×
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <select
          value={selected}
          disabled={pending}
          onChange={(e) => {
            const userId = e.target.value;
            setSelected("");
            if (!userId) return;
            startTransition(async () => {
              await addNotificationRecipient(type, userId);
              router.refresh();
            });
          }}
          className="rounded-md border border-border-strong bg-surface px-1.5 py-0.5 text-[11px] text-muted outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="">+ Add recipient…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
