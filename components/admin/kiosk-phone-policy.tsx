"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setKioskAllowAnyPhone } from "@/lib/actions-client/kiosk-admin";

export function KioskPhonePolicy({ allowed }: { allowed: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-5"
          checked={allowed}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              setError(null);
              try {
                await setKioskAllowAnyPhone(e.target.checked);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
              }
            })
          }
        />
        <span>
          <span className="font-medium">Let staff use their own phone</span>
          <span className="mt-0.5 block text-muted">
            Anyone can tap the NFC tag (or scan the QR code) with any phone, pick their name and enter their PIN. Nothing needs installing and the phone does not have to be registered. Wrong
            PINs are limited per person and per network. Switch this off to allow only the registered iPads; phone sessions then end straight away.
          </span>
        </span>
      </label>
      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
