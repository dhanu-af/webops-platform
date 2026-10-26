"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createKioskDevice, renewKioskSetup, revokeKioskDevice } from "@/lib/actions-client/kiosk-admin";

export type KioskDeviceRow = {
  id: string;
  name: string;
  status: "WAITING" | "REGISTERED" | "REVOKED" | "EXPIRED";
  lastSeen: string | null;
  createdAt: string;
};

const STATUS: Record<KioskDeviceRow["status"], { label: string; tone: "pass" | "warn" | "critical" | "neutral" }> = {
  WAITING: { label: "Waiting for setup", tone: "warn" },
  EXPIRED: { label: "Setup link expired", tone: "neutral" },
  REGISTERED: { label: "Registered", tone: "pass" },
  REVOKED: { label: "Revoked", tone: "critical" },
};

export function KioskDevices({ devices }: { devices: KioskDeviceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ deviceName: string; url: string; qr: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function showLink(deviceName: string, code: string) {
    const url = `${window.location.origin}/k/setup/${code}`;
    setLink({ deviceName, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 320 }) });
    setCopied(false);
  }

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label className="text-xs font-medium text-muted-strong">Name of the iPad</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bottling line iPad"
            className="mt-1.5 block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <Button
          size="sm"
          disabled={pending || name.trim().length < 2}
          onClick={() =>
            run(async () => {
              const created = await createKioskDevice(name);
              await showLink(name.trim(), created.code);
              setName("");
            })
          }
        >
          {pending ? "Adding…" : "Add iPad"}
        </Button>
      </div>

      {link && (
        <div className="rounded-[var(--radius)] border border-accent/40 bg-accent-soft p-4">
          <p className="text-sm font-semibold text-foreground">Setup link for &ldquo;{link.deviceName}&rdquo;</p>
          <p className="mt-1 text-xs text-muted-strong">
            Open this link on the iPad (or scan the code with its camera). It works once and expires in 24 hours. It is shown only now. The iPad is registered
            for the address you are using: <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={link.qr} alt="Setup QR code" className="size-40 rounded-md bg-white p-1" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-all rounded-md bg-surface px-3 py-2 font-mono text-xs text-foreground">{link.url}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(link.url).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-muted">No iPads have been added yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted">
                  Added {d.createdAt}
                  {d.lastSeen ? ` · last used ${d.lastSeen}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge>
                {d.status !== "REVOKED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const renewed = await renewKioskSetup(d.id);
                        await showLink(d.name, renewed.code);
                      })
                    }
                  >
                    New setup link
                  </Button>
                )}
                {d.status !== "REVOKED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Revoke "${d.name}"? It stops working straight away and anyone signed in on it is signed out.`)) run(() => revokeKioskDevice(d.id));
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
