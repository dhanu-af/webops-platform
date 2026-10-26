"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A scanned code is only followed if it is one of our machine tags; the path is opened on this site, never elsewhere. */
export function tagPathFromScan(text: string): string | null {
  try {
    const url = new URL(text, "https://placeholder.invalid");
    return /^\/k\/t\/[A-Za-z0-9_-]{8,}$/.test(url.pathname) ? url.pathname : null;
  } catch {
    return null;
  }
}

/**
 * Scans a machine's QR code with the iPad camera inside the page, so the iPad can stay locked to this app.
 * (An iPad cannot read NFC tags; iPhones and Android phones tap the NFC tag instead.)
 */
export function KioskScanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let frame = 0;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        const { default: jsQR } = await import("jsqr");

        const tick = () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
              const path = code ? tagPathFromScan(code.data) : null;
              if (path) {
                stopped = true;
                router.push(path);
                return;
              }
            }
          }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("The camera could not be opened. Allow camera access for this page, or choose the machine from the list below.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, router]);

  if (!open) {
    return (
      <Button size="lg" className="w-full" onClick={() => { setError(null); setOpen(true); }}>
        <ScanLine className="size-5" /> Scan a machine tag (QR)
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface p-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-4 border-white/70" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error ? <p role="alert" className="text-sm font-medium text-status-critical">{error}</p> : <p className="text-center text-sm text-muted">Hold the QR code on the machine inside the frame.</p>}
      <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
        Close camera
      </Button>
    </div>
  );
}
