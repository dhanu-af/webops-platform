"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, X, Loader2 } from "lucide-react";
import { attachPhoto } from "@/lib/actions/inspections";

export function PhotoUpload({
  inspectionId,
  responseId,
  findingId,
  existingPhotos,
  required = false,
}: {
  inspectionId: string;
  responseId?: string;
  findingId?: string;
  existingPhotos: Array<{ id: string; storagePath: string; caption: string | null }>;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setPreview(URL.createObjectURL(file));
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("inspectionId", inspectionId);
        if (responseId) formData.set("responseId", responseId);
        if (findingId) formData.set("findingId", findingId);
        formData.set("file", file);
        await attachPhoto(formData);
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        setPreview(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {existingPhotos.map((p) => (
          <a
            key={p.id}
            href={p.storagePath}
            target="_blank"
            rel="noreferrer"
            className="relative size-16 overflow-hidden rounded-lg border border-border bg-surface-sunken"
          >
            <Image src={p.storagePath} alt={p.caption ?? "Evidence photo"} fill sizes="64px" className="object-cover" unoptimized />
          </a>
        ))}
        {preview && (
          <div className="relative size-16 overflow-hidden rounded-lg border border-accent">
            <Image src={preview} alt="Uploading" fill sizes="64px" className="object-cover opacity-60" unoptimized />
            <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-white" />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className={`flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[10px] font-medium ${
            required && existingPhotos.length === 0 ? "border-status-critical text-status-critical" : "border-border-strong text-muted"
          }`}
        >
          <Camera className="size-4" />
          Photo
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {required && existingPhotos.length === 0 && (
        <p className="text-xs text-status-critical">Photo evidence required for this failed item.</p>
      )}
      {error && <p className="flex items-center gap-1 text-xs text-status-critical"><X className="size-3" /> {error}</p>}
    </div>
  );
}
