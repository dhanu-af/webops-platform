"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markChecklistTagWritten } from "@/lib/actions-client/kiosk-admin";

/** Copies a tag address so it can be pasted into an NFC writer app. */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

/** Marks a document's NFC tag as written and stuck on, or puts it back to "needs a tag". */
export function TagWrittenButton({ checklistId, written }: { checklistId: string; written: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        size="sm"
        variant={written ? "ghost" : "primary"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await markChecklistTagWritten(checklistId, !written);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong.");
            }
          })
        }
      >
        {written ? "Undo" : "Mark tag as written"}
      </Button>
      {error && <span role="alert" className="text-xs text-status-critical">{error}</span>}
    </>
  );
}
