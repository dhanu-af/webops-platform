"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskIdentify } from "@/components/kiosk/kiosk-identify";

/** "Sign in with your PIN" on the start page, for anyone who has not tapped a tag: once signed in they can pick a document or machine. */
export function KioskSignInPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="lg" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <KeyRound className="size-5" /> Sign in with your PIN
      </Button>
    );
  }
  return <KioskIdentify onCancel={() => setOpen(false)} onSignedIn={() => router.refresh()} />;
}
